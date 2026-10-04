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
      const pt = Calc.scorePt(rules, g.mode, entry.finalScore, rank);
      stats.rankSum += rank;
      stats.rankDist[rank] = (stats.rankDist[rank] || 0) + 1;
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

    return stats;
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
