// 収支pt計算・成績集計ロジック。
"use strict";

const Calc = {
  // 収支pt = (最終持ち点 − 返し点) ÷ 1000 + ウマ + オカ(1着のみ)
  scorePt(rules, mode, finalScore, rank) {
    const r = rules[mode];
    const uma = r.uma[rank - 1] || 0;
    const oka = rank === 1 ? r.oka : 0;
    return (Number(finalScore) - r.return) / 1000 + uma + oka;
  },

  playerCountForMode(mode) {
    return mode === "sanma" ? 3 : 4;
  },

  // 最終持ち点から着順を自動で決める。持ち点が同じ場合は、入力された順番が早い方を上位とする。
  // entries: [{ playerId, finalScore }, ...]  戻り値: { playerId: rank, ... }
  ranksFromScores(entries) {
    const indexed = entries.map((e, i) => Object.assign({}, e, { _i: i }));
    indexed.sort((a, b) => b.finalScore - a.finalScore || a._i - b._i);
    const ranks = {};
    indexed.forEach((e, idx) => {
      ranks[e.playerId] = idx + 1;
    });
    return ranks;
  },

  // 半荘データの入力チェック。着順の重複・範囲外、持ち点合計のズレを検出する。
  validateGame(game, rules) {
    const n = Calc.playerCountForMode(game.mode);
    const ranks = game.players.map((p) => Number(p.rank));
    const rankSeen = new Set();
    let rankDuplicate = false;
    let rankOutOfRange = false;
    ranks.forEach((r) => {
      if (!r || r < 1 || r > n) rankOutOfRange = true;
      if (rankSeen.has(r)) rankDuplicate = true;
      rankSeen.add(r);
    });

    const sum = game.players.reduce((s, p) => s + Number(p.finalScore || 0), 0);
    const expected = rules[game.mode].start * n;

    return {
      rankDuplicate,
      rankOutOfRange,
      rankError: rankDuplicate || rankOutOfRange,
      sum,
      expected,
      sumError: sum !== expected,
      ok: !rankDuplicate && !rankOutOfRange && sum === expected,
    };
  },

  // 局ごとの記録(kyokuLog)から、参加者ごとの和了回数・放銃回数を集計する。
  // kyokuLog: [{ winnerId, method: 'tsumo'|'ron', dealInId }]  winnerIdがnullなら流局
  countsFromKyokuLog(kyokuLog, participantIds) {
    const counts = {};
    participantIds.forEach((id) => (counts[id] = { agari: 0, houjuu: 0 }));
    (kyokuLog || []).forEach((k) => {
      if (k.winnerId && counts[k.winnerId]) counts[k.winnerId].agari += 1;
      if (k.method === "ron" && k.dealInId && counts[k.dealInId]) counts[k.dealInId].houjuu += 1;
    });
    return counts;
  },

  filterGames(games, { period, mode }) {
    const now = new Date();
    return games.filter((g) => {
      if (mode && mode !== "all" && g.mode !== mode) return false;
      if (!period || period === "all") return true;
      const d = new Date(g.date);
      if (period === "month") {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      if (period === "year") {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  },

  // 指定プレイヤーの成績を集計する。games は日付の昇順でなくてよい(内部でソートする)。
  aggregatePlayer(playerId, games, rules) {
    const related = games
      .filter((g) => g.players.some((p) => p.playerId === playerId))
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date) || String(a.id).localeCompare(String(b.id)));

    const stats = {
      gamesCount: related.length,
      rankSum: 0,
      rankDist: {}, // {1: n, 2: n, ...}
      firstCount: 0,
      lastCount: 0,
      totalAgari: 0,
      totalHoujuu: 0,
      totalKyoku: 0,
      totalPt: 0,
      history: [], // [{date, pt, cumulativePt, place}]
    };

    let cumulative = 0;
    related.forEach((g) => {
      const entry = g.players.find((p) => p.playerId === playerId);
      const rank = Number(entry.rank);
      const lastRank = Calc.playerCountForMode(g.mode);
      const pt = Calc.scorePt(rules, g.mode, entry.finalScore, rank);
      stats.rankSum += rank;
      stats.rankDist[rank] = (stats.rankDist[rank] || 0) + 1;
      if (rank === 1) stats.firstCount += 1;
      if (rank === lastRank) stats.lastCount += 1;
      stats.totalAgari += Number(entry.agariCount || 0);
      stats.totalHoujuu += Number(entry.houjuuCount || 0);
      stats.totalKyoku += Number(g.totalKyoku || 0);
      stats.totalPt += pt;
      cumulative += pt;
      stats.history.push({
        gameId: g.id,
        date: g.date,
        place: g.place,
        mode: g.mode,
        pt,
        cumulativePt: cumulative,
      });
    });

    stats.avgRank = stats.gamesCount ? stats.rankSum / stats.gamesCount : null;
    stats.agariRate = stats.totalKyoku ? stats.totalAgari / stats.totalKyoku : null;
    stats.houjuuRate = stats.totalKyoku ? stats.totalHoujuu / stats.totalKyoku : null;
    stats.topRate = stats.gamesCount ? stats.firstCount / stats.gamesCount : null;
    stats.lastRate = stats.gamesCount ? stats.lastCount / stats.gamesCount : null;

    return stats;
  },

  // --- プレイスタイル診断・ランク判定 ---
  // 和了率・放銃率の「平均的な目安」。実際の統計には個人差・場況差があるため、
  // あくまで大まかな目安として扱う(4人麻雀と3人麻雀では和了りやすさが大きく異なるため分けている)。
  STYLE_BASELINE: {
    yonma: { agari: 0.2, houjuu: 0.13 },
    sanma: { agari: 0.28, houjuu: 0.17 },
  },
  STYLE_DELTA: 0.025, // この幅(2.5pt)を超えて平均的な目安から離れていたら「高い/低い」と判定する
  STYLE_MIN_GAMES: 5,

  // 和了率・放銃率から大まかなプレイスタイルを診断する。
  playStyle(stats, mode) {
    const base = this.STYLE_BASELINE[mode === "sanma" ? "sanma" : "yonma"];
    if (!stats.gamesCount || stats.gamesCount < this.STYLE_MIN_GAMES || stats.agariRate == null || stats.houjuuRate == null) {
      return {
        key: "unknown",
        label: "診断中",
        desc: `対局数が増えるとスタイルが分かります(目安: ${this.STYLE_MIN_GAMES}試合以上)。`,
      };
    }
    const d = this.STYLE_DELTA;
    const agariHigh = stats.agariRate >= base.agari + d;
    const agariLow = stats.agariRate <= base.agari - d;
    const houjuuHigh = stats.houjuuRate >= base.houjuu + d;
    const houjuuLow = stats.houjuuRate <= base.houjuu - d;

    if (agariHigh && houjuuLow) {
      return { key: "skilled", label: "巧者型", desc: "和了も多く放銃も少ない、理想的な打ち筋です。" };
    }
    if (agariHigh && houjuuHigh) {
      return { key: "aggressive", label: "攻撃型", desc: "積極的に攻めて和了を重ねる一方、放銃もやや多めです。" };
    }
    if (agariLow && houjuuLow) {
      return { key: "defensive", label: "守備型", desc: "放銃を避ける手堅い打ち筋です。和了はやや少なめです。" };
    }
    if (agariLow && houjuuHigh) {
      return { key: "unstable", label: "不安定型", desc: "和了が少ない割に放銃が多め。押し引きの見直しが効果的かもしれません。" };
    }
    return { key: "balanced", label: "バランス型", desc: "攻めと守りのバランスが取れた安定型の打ち筋です。" };
  },

  RANK_TIERS: [
    { tier: 1, name: "駆け出し雀士", minGames: 0 },
    { tier: 2, name: "一人前雀士", minGames: 3 },
    { tier: 3, name: "手練の雀士", minGames: 8 },
    { tier: 4, name: "雀卓の達人", minGames: 20 },
    { tier: 5, name: "麻雀仙人", minGames: 40 },
  ],
  RANK_AVG_RANK_THRESHOLDS: {
    // 平均着順がこの値以下ならそのtier相当、という目安(小さいほど好成績)
    yonma: { 5: 2.2, 4: 2.35, 3: 2.5, 2: 2.65 },
    sanma: { 5: 1.7, 4: 1.85, 3: 2.0, 2: 2.15 },
  },
  RANK_DESCRIPTIONS: {
    1: "まずは場数を踏んで、打ち筋をつかんでいきましょう。",
    2: "基本はしっかり身についてきました。",
    3: "平均着順が安定してきた、頼れる打ち手です。",
    4: "どの卓でも上位をうかがえる実力者です。",
    5: "卓を支配する、まさに仙人級の安定感です。",
  },

  // 平均着順と対局数から5段階のランクを判定する。
  // 平均着順だけで決めると少ない試合数でもすぐ高ランクになってしまうため、
  // 各ランクには必要対局数(minGames)も設けている。
  playerRank(stats, mode) {
    if (!stats.gamesCount || stats.avgRank == null) {
      return { tier: 0, name: "未判定", desc: "対局を記録するとランクが表示されます。", gated: false };
    }
    const th = this.RANK_AVG_RANK_THRESHOLDS[mode === "sanma" ? "sanma" : "yonma"];
    let tentative = 1;
    if (stats.avgRank <= th[5]) tentative = 5;
    else if (stats.avgRank <= th[4]) tentative = 4;
    else if (stats.avgRank <= th[3]) tentative = 3;
    else if (stats.avgRank <= th[2]) tentative = 2;

    const minGames = {};
    this.RANK_TIERS.forEach((t) => (minGames[t.tier] = t.minGames));

    let tier = tentative;
    while (tier > 1 && stats.gamesCount < minGames[tier]) tier -= 1;

    const names = {};
    this.RANK_TIERS.forEach((t) => (names[t.tier] = t.name));

    const result = {
      tier,
      name: names[tier],
      desc: this.RANK_DESCRIPTIONS[tier],
      gated: tier < tentative,
    };
    if (result.gated) {
      result.gamesUntilNext = minGames[tentative] - stats.gamesCount;
      result.nextName = names[tentative];
    }
    return result;
  },

  round1(n) {
    if (n == null || Number.isNaN(n)) return "-";
    return (Math.round(n * 10) / 10).toFixed(1);
  },

  roundPct(n) {
    if (n == null || Number.isNaN(n)) return "-";
    return (Math.round(n * 1000) / 10).toFixed(1) + "%";
  },

  formatPt(n) {
    if (n == null || Number.isNaN(n)) return "-";
    const v = Math.round(n * 10) / 10;
    const sign = v > 0 ? "+" : "";
    return sign + v.toFixed(1);
  },
};
