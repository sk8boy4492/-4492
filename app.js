// 画面の描画・イベント処理をまとめたメインスクリプト。
"use strict";

const App = {
  state: {
    tab: "input", // input | history | stats | settings
    editingGameId: null, // 履歴から編集中の半荘ID(nullなら新規)
    statsPlayerId: null,
    statsPeriod: "all",
    statsMode: "all",
    rankSort: { key: "totalPt", dir: "desc" },
  },
  players: [],
  games: [],
  rules: null,

  init() {
    this.players = Store.loadPlayers();
    this.games = Store.loadGames();
    this.rules = Store.loadRules();

    this.bindNav();
    this.bindGlobalButtons();
    this.render();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch((e) => {
          console.error("Service Worker登録失敗", e);
        });
      });
    }
  },

  // ---------- 共通 ----------
  bindNav() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.state.tab = btn.dataset.tab;
        if (this.state.tab === "input") this.state.editingGameId = null;
        this.render();
      });
    });
  },

  bindGlobalButtons() {
    document.getElementById("export-btn").addEventListener("click", () => this.exportData());
    document.getElementById("import-input").addEventListener("change", (e) => this.importData(e));
  },

  render() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === this.state.tab);
    });
    document.querySelectorAll(".screen").forEach((s) => (s.hidden = true));
    const screen = document.getElementById("screen-" + this.state.tab);
    screen.hidden = false;

    if (this.state.tab === "input") this.renderInputScreen();
    if (this.state.tab === "history") this.renderHistoryScreen();
    if (this.state.tab === "stats") this.renderStatsScreen();
    if (this.state.tab === "settings") this.renderSettingsScreen();
  },

  toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    el.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => (el.hidden = true), 200);
    }, 2200);
  },

  playerName(id) {
    const p = this.players.find((p) => p.id === id);
    return p ? p.name : "(削除済み)";
  },

  // ---------- プレイヤー管理(設定タブ内) ----------
  renderSettingsScreen() {
    const root = document.getElementById("screen-settings");
    const r = this.rules;
    root.innerHTML = `
      <section class="card">
        <h2>プレイヤー管理</h2>
        <div id="player-list"></div>
        <form id="player-form" class="form-grid">
          <input type="hidden" name="id" />
          <label class="field">
            <span>名前</span>
            <input type="text" name="name" required maxlength="20" placeholder="例: 田中" />
          </label>
          <label class="field">
            <span>メモ(任意)</span>
            <input type="text" name="memo" maxlength="40" placeholder="例: 会社の同僚" />
          </label>
          <label class="field checkbox-field">
            <input type="checkbox" name="isMe" />
            <span>自分としてマークする</span>
          </label>
          <div class="btn-row">
            <button type="submit" class="btn btn-primary">登録する</button>
            <button type="button" id="player-cancel-edit" class="btn btn-ghost" hidden>編集をやめる</button>
          </div>
        </form>
      </section>

      <section class="card">
        <h2>ルール設定</h2>
        <h3>四麻</h3>
        <div class="form-grid">
          <label class="field"><span>配給原点</span><input type="number" id="r-yonma-start" value="${r.yonma.start}" /></label>
          <label class="field"><span>返し点</span><input type="number" id="r-yonma-return" value="${r.yonma.return}" /></label>
          <label class="field"><span>ウマ 1位</span><input type="number" id="r-yonma-uma1" value="${r.yonma.uma[0]}" /></label>
          <label class="field"><span>ウマ 2位</span><input type="number" id="r-yonma-uma2" value="${r.yonma.uma[1]}" /></label>
          <label class="field"><span>ウマ 3位</span><input type="number" id="r-yonma-uma3" value="${r.yonma.uma[2]}" /></label>
          <label class="field"><span>ウマ 4位</span><input type="number" id="r-yonma-uma4" value="${r.yonma.uma[3]}" /></label>
          <label class="field"><span>オカ(1位のみ)</span><input type="number" id="r-yonma-oka" value="${r.yonma.oka}" /></label>
        </div>
        <h3>三麻</h3>
        <div class="form-grid">
          <label class="field"><span>配給原点</span><input type="number" id="r-sanma-start" value="${r.sanma.start}" /></label>
          <label class="field"><span>返し点</span><input type="number" id="r-sanma-return" value="${r.sanma.return}" /></label>
          <label class="field"><span>ウマ 1位</span><input type="number" id="r-sanma-uma1" value="${r.sanma.uma[0]}" /></label>
          <label class="field"><span>ウマ 2位</span><input type="number" id="r-sanma-uma2" value="${r.sanma.uma[1]}" /></label>
          <label class="field"><span>ウマ 3位</span><input type="number" id="r-sanma-uma3" value="${r.sanma.uma[2]}" /></label>
          <label class="field"><span>オカ(1位のみ)</span><input type="number" id="r-sanma-oka" value="${r.sanma.oka}" /></label>
        </div>
        <div class="btn-row">
          <button type="button" id="rules-save" class="btn btn-primary">ルールを保存</button>
        </div>
        <p class="hint">収支pt = (最終持ち点 − 返し点) ÷ 1000 + ウマ + オカ(1着のみ)</p>
      </section>

      <section class="card">
        <h2>データのバックアップ</h2>
        <p class="hint">スマホの機種変更やブラウザのデータ消去に備えて、ときどきJSONファイルに書き出しておくことをおすすめします。</p>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" onclick="document.getElementById('export-btn').click()">JSONを書き出す</button>
          <button type="button" class="btn btn-ghost" onclick="document.getElementById('import-input').click()">JSONを読み込む</button>
        </div>
      </section>
    `;

    this.renderPlayerList();

    const form = document.getElementById("player-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.savePlayerFromForm(form);
    });
    document.getElementById("player-cancel-edit").addEventListener("click", () => {
      form.reset();
      form.elements.id.value = "";
      document.getElementById("player-cancel-edit").hidden = true;
      form.querySelector('button[type="submit"]').textContent = "登録する";
    });

    document.getElementById("rules-save").addEventListener("click", () => this.saveRulesFromForm());
  },

  renderPlayerList() {
    const container = document.getElementById("player-list");
    if (!this.players.length) {
      container.innerHTML = '<p class="hint">まだプレイヤーが登録されていません。下のフォームから登録してください。</p>';
      return;
    }
    container.innerHTML = this.players
      .map(
        (p) => `
      <div class="list-row" data-id="${p.id}">
        <div class="list-row-main">
          <span class="player-name">${esc(p.name)}</span>
          ${p.isMe ? '<span class="badge badge-me">自分</span>' : ""}
          ${p.memo ? `<span class="player-memo">${esc(p.memo)}</span>` : ""}
        </div>
        <div class="list-row-actions">
          <button type="button" class="icon-btn edit-player" aria-label="編集">編集</button>
          <button type="button" class="icon-btn danger delete-player" aria-label="削除">削除</button>
        </div>
      </div>`
      )
      .join("");

    container.querySelectorAll(".edit-player").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        const id = e.target.closest(".list-row").dataset.id;
        this.editPlayer(id);
      })
    );
    container.querySelectorAll(".delete-player").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        const id = e.target.closest(".list-row").dataset.id;
        this.deletePlayer(id);
      })
    );
  },

  editPlayer(id) {
    const p = this.players.find((p) => p.id === id);
    if (!p) return;
    const form = document.getElementById("player-form");
    form.elements.id.value = p.id;
    form.elements.name.value = p.name;
    form.elements.memo.value = p.memo || "";
    form.elements.isMe.checked = !!p.isMe;
    document.getElementById("player-cancel-edit").hidden = false;
    form.querySelector('button[type="submit"]').textContent = "更新する";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  },

  savePlayerFromForm(form) {
    const id = form.elements.id.value;
    const name = form.elements.name.value.trim();
    const memo = form.elements.memo.value.trim();
    const isMe = form.elements.isMe.checked;
    if (!name) {
      this.toast("名前を入力してください");
      return;
    }
    if (isMe) {
      this.players.forEach((p) => {
        if (p.id !== id) p.isMe = false;
      });
    }
    if (id) {
      const p = this.players.find((p) => p.id === id);
      Object.assign(p, { name, memo, isMe });
    } else {
      this.players.push({ id: genId(), name, memo, isMe });
    }
    Store.savePlayers(this.players);
    form.reset();
    form.elements.id.value = "";
    document.getElementById("player-cancel-edit").hidden = true;
    form.querySelector('button[type="submit"]').textContent = "登録する";
    this.renderPlayerList();
    this.toast("プレイヤーを保存しました");
  },

  deletePlayer(id) {
    const used = this.games.some((g) => g.players.some((p) => p.playerId === id));
    const msg = used
      ? "このプレイヤーは過去の対局記録に使われています。削除すると記録上の表示が「削除済み」になりますが記録自体は残ります。削除しますか?"
      : "このプレイヤーを削除しますか?";
    if (!confirm(msg)) return;
    this.players = this.players.filter((p) => p.id !== id);
    Store.savePlayers(this.players);
    this.renderPlayerList();
    this.toast("削除しました");
  },

  saveRulesFromForm() {
    const num = (id) => Number(document.getElementById(id).value);
    const rules = {
      yonma: {
        start: num("r-yonma-start"),
        return: num("r-yonma-return"),
        uma: [num("r-yonma-uma1"), num("r-yonma-uma2"), num("r-yonma-uma3"), num("r-yonma-uma4")],
        oka: num("r-yonma-oka"),
      },
      sanma: {
        start: num("r-sanma-start"),
        return: num("r-sanma-return"),
        uma: [num("r-sanma-uma1"), num("r-sanma-uma2"), num("r-sanma-uma3")],
        oka: num("r-sanma-oka"),
      },
    };
    this.rules = rules;
    Store.saveRules(rules);
    this.toast("ルールを保存しました");
  },

  // ---------- 対局入力 ----------
  renderInputScreen() {
    const root = document.getElementById("screen-input");
    const editing = this.state.editingGameId
      ? this.games.find((g) => g.id === this.state.editingGameId)
      : null;
    const mode = editing ? editing.mode : "yonma";

    if (this.players.length < 3) {
      root.innerHTML = `<section class="card"><p class="hint">対局を記録する前に、設定タブから最低3人のプレイヤーを登録してください。</p></section>`;
      return;
    }

    root.innerHTML = `
      <section class="card">
        <h2>${editing ? "半荘の記録を編集" : "半荘を記録する"}</h2>
        <form id="game-form">
          <div class="form-grid">
            <label class="field">
              <span>日付</span>
              <input type="date" name="date" required value="${editing ? editing.date : todayStr()}" />
            </label>
            <label class="field">
              <span>場所(任意)</span>
              <input type="text" name="place" maxlength="20" value="${editing ? esc(editing.place || "") : ""}" placeholder="例: 雀荘〇〇" />
            </label>
            <label class="field">
              <span>形式</span>
              <select name="mode" id="mode-select">
                <option value="yonma" ${mode === "yonma" ? "selected" : ""}>四麻</option>
                <option value="sanma" ${mode === "sanma" ? "selected" : ""}>三麻</option>
              </select>
            </label>
            <label class="field">
              <span>総局数</span>
              <input type="number" name="totalKyoku" min="1" max="30" required value="${editing ? editing.totalKyoku : 8}" />
            </label>
          </div>

          <h3>参加プレイヤーと結果</h3>
          <div id="player-rows"></div>

          <div class="calc-preview" id="calc-preview"></div>
          <div class="warning-box" id="warning-box" hidden></div>

          <div class="btn-row">
            <button type="submit" class="btn btn-primary btn-large">${editing ? "更新する" : "記録する"}</button>
            ${editing ? '<button type="button" id="delete-game-btn" class="btn btn-danger">この記録を削除</button>' : ""}
            ${editing ? '<button type="button" id="cancel-edit-btn" class="btn btn-ghost">新規入力に戻る</button>' : ""}
          </div>
        </form>
      </section>
    `;

    const form = document.getElementById("game-form");
    const modeSelect = document.getElementById("mode-select");

    const buildRows = () => {
      const n = Calc.playerCountForMode(modeSelect.value);
      const rowsEl = document.getElementById("player-rows");
      const existingSelections = editing ? editing.players : [];
      let html = "";
      for (let i = 0; i < n; i++) {
        const ex = existingSelections[i] || {};
        html += `
          <div class="player-row" data-slot="${i}">
            <div class="player-row-head">
              <select class="pr-player" required>
                <option value="">プレイヤーを選択</option>
                ${this.players
                  .map(
                    (p) =>
                      `<option value="${p.id}" ${ex.playerId === p.id ? "selected" : ""}>${esc(p.name)}${p.isMe ? "(自分)" : ""}</option>`
                  )
                  .join("")}
              </select>
              <select class="pr-rank" required>
                <option value="">着順</option>
                ${Array.from({ length: n }, (_, k) => k + 1)
                  .map((r) => `<option value="${r}" ${ex.rank === r ? "selected" : ""}>${r}着</option>`)
                  .join("")}
              </select>
            </div>
            <div class="player-row-body">
              <label class="field small"><span>最終持ち点</span><input type="number" class="pr-score" step="100" value="${ex.finalScore ?? ""}" required /></label>
              <label class="field small"><span>和了回数</span><input type="number" class="pr-agari" min="0" value="${ex.agariCount ?? 0}" required /></label>
              <label class="field small"><span>放銃回数</span><input type="number" class="pr-houjuu" min="0" value="${ex.houjuuCount ?? 0}" required /></label>
            </div>
          </div>`;
      }
      rowsEl.innerHTML = html;
      rowsEl.querySelectorAll("input, select").forEach((el) => el.addEventListener("input", updatePreview));
      updatePreview();
    };

    const updatePreview = () => {
      const mode = modeSelect.value;
      const n = Calc.playerCountForMode(mode);
      const rows = Array.from(document.querySelectorAll(".player-row"));
      const data = rows.map((row) => ({
        playerId: row.querySelector(".pr-player").value,
        rank: Number(row.querySelector(".pr-rank").value) || 0,
        finalScore: Number(row.querySelector(".pr-score").value) || 0,
        agariCount: Number(row.querySelector(".pr-agari").value) || 0,
        houjuuCount: Number(row.querySelector(".pr-houjuu").value) || 0,
      }));

      const preview = document.getElementById("calc-preview");
      const complete = data.every((d) => d.playerId && d.rank);
      if (complete) {
        preview.innerHTML =
          "<h3>収支pt(自動計算)</h3>" +
          data
            .map((d) => {
              const pt = Calc.scorePt(this.rules, mode, d.finalScore, d.rank);
              return `<div class="preview-row"><span>${esc(this.playerName(d.playerId))}(${d.rank}着)</span><span class="${pt >= 0 ? "pt-pos" : "pt-neg"}">${Calc.formatPt(pt)}pt</span></div>`;
            })
            .join("");
      } else {
        preview.innerHTML = "";
      }

      const warnBox = document.getElementById("warning-box");
      const msgs = [];
      const ids = data.map((d) => d.playerId).filter(Boolean);
      if (new Set(ids).size !== ids.length && ids.length > 1) {
        msgs.push("同じプレイヤーが複数選択されています。");
      }
      const ranks = data.map((d) => d.rank).filter(Boolean);
      if (new Set(ranks).size !== ranks.length && ranks.length > 1) {
        msgs.push("着順が重複しています。");
      }
      const sum = data.reduce((s, d) => s + d.finalScore, 0);
      const expected = this.rules[mode].start * n;
      if (complete && sum !== expected) {
        msgs.push(`持ち点の合計が${expected.toLocaleString()}点になっていません(現在の合計: ${sum.toLocaleString()}点)。`);
      }
      if (msgs.length) {
        warnBox.hidden = false;
        warnBox.innerHTML = "⚠ " + msgs.join("<br>⚠ ");
      } else {
        warnBox.hidden = true;
        warnBox.innerHTML = "";
      }
    };

    modeSelect.addEventListener("change", buildRows);
    buildRows();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.submitGameForm(form, editing);
    });

    if (editing) {
      document.getElementById("delete-game-btn").addEventListener("click", () => this.deleteGame(editing.id));
      document.getElementById("cancel-edit-btn").addEventListener("click", () => {
        this.state.editingGameId = null;
        this.render();
      });
    }
  },

  submitGameForm(form, editing) {
    const mode = form.elements.mode.value;
    const date = form.elements.date.value;
    const place = form.elements.place.value.trim();
    const totalKyoku = Number(form.elements.totalKyoku.value);

    const rows = Array.from(document.querySelectorAll(".player-row"));
    const players = rows.map((row) => ({
      playerId: row.querySelector(".pr-player").value,
      rank: Number(row.querySelector(".pr-rank").value),
      finalScore: Number(row.querySelector(".pr-score").value),
      agariCount: Number(row.querySelector(".pr-agari").value) || 0,
      houjuuCount: Number(row.querySelector(".pr-houjuu").value) || 0,
    }));

    if (players.some((p) => !p.playerId || !p.rank)) {
      this.toast("すべてのプレイヤーと着順を入力してください");
      return;
    }
    const ids = players.map((p) => p.playerId);
    if (new Set(ids).size !== ids.length) {
      this.toast("同じプレイヤーが重複しています");
      return;
    }

    const game = { id: editing ? editing.id : genId(), date, place, mode, totalKyoku, players };
    const check = Calc.validateGame(game, this.rules);

    if (check.rankError) {
      this.toast("着順が正しくありません(重複・抜けがあります)");
      return;
    }
    if (check.sumError) {
      const proceed = confirm(
        `持ち点の合計が${check.expected.toLocaleString()}点になっていません(現在: ${check.sum.toLocaleString()}点)。このまま保存しますか?`
      );
      if (!proceed) return;
    }

    if (editing) {
      const idx = this.games.findIndex((g) => g.id === editing.id);
      this.games[idx] = game;
    } else {
      this.games.push(game);
    }
    Store.saveGames(this.games);
    this.toast(editing ? "記録を更新しました" : "記録しました");
    this.state.editingGameId = null;
    this.state.tab = "history";
    this.render();
  },

  deleteGame(id) {
    if (!confirm("この半荘の記録を削除しますか? この操作は取り消せません。")) return;
    this.games = this.games.filter((g) => g.id !== id);
    Store.saveGames(this.games);
    this.state.editingGameId = null;
    this.state.tab = "history";
    this.toast("削除しました");
    this.render();
  },

  // ---------- 履歴 ----------
  renderHistoryScreen() {
    const root = document.getElementById("screen-history");
    const sorted = this.games
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.id).localeCompare(String(a.id)));

    if (!sorted.length) {
      root.innerHTML = `<section class="card"><p class="hint">まだ記録がありません。「入力」タブから半荘を記録しましょう。</p></section>`;
      return;
    }

    root.innerHTML = `
      <section class="card">
        <h2>対局履歴(${sorted.length}件)</h2>
        <div id="history-list"></div>
      </section>
    `;

    const list = document.getElementById("history-list");
    list.innerHTML = sorted
      .map((g) => {
        const n = Calc.playerCountForMode(g.mode);
        const sorted2 = g.players.slice().sort((a, b) => a.rank - b.rank);
        const summary = sorted2
          .map((p) => `${p.rank}着 ${esc(this.playerName(p.playerId))}`)
          .join(" / ");
        return `
        <button type="button" class="list-row history-row" data-id="${g.id}">
          <div class="list-row-main">
            <div class="history-date">${formatDateJa(g.date)} ${g.place ? "・" + esc(g.place) : ""}</div>
            <div class="history-mode">${g.mode === "yonma" ? "四麻" : "三麻"} / 全${g.totalKyoku}局</div>
            <div class="history-summary">${summary}</div>
          </div>
          <div class="list-row-chevron">›</div>
        </button>`;
      })
      .join("");

    list.querySelectorAll(".history-row").forEach((row) => {
      row.addEventListener("click", () => {
        this.state.editingGameId = row.dataset.id;
        this.state.tab = "input";
        this.render();
        window.scrollTo({ top: 0 });
      });
    });
  },

  // ---------- 成績 ----------
  renderStatsScreen() {
    const root = document.getElementById("screen-stats");
    if (!this.players.length) {
      root.innerHTML = `<section class="card"><p class="hint">プレイヤーを登録すると成績が表示されます。</p></section>`;
      return;
    }
    if (!this.state.statsPlayerId) {
      const me = this.players.find((p) => p.isMe);
      this.state.statsPlayerId = (me || this.players[0]).id;
    }

    root.innerHTML = `
      <section class="card">
        <h2>成績</h2>
        <div class="filter-row">
          <label class="field small">
            <span>期間</span>
            <select id="stats-period">
              <option value="all" ${this.state.statsPeriod === "all" ? "selected" : ""}>全期間</option>
              <option value="month" ${this.state.statsPeriod === "month" ? "selected" : ""}>今月</option>
              <option value="year" ${this.state.statsPeriod === "year" ? "selected" : ""}>今年</option>
            </select>
          </label>
          <label class="field small">
            <span>形式</span>
            <select id="stats-mode">
              <option value="all" ${this.state.statsMode === "all" ? "selected" : ""}>すべて</option>
              <option value="yonma" ${this.state.statsMode === "yonma" ? "selected" : ""}>四麻</option>
              <option value="sanma" ${this.state.statsMode === "sanma" ? "selected" : ""}>三麻</option>
            </select>
          </label>
        </div>
      </section>

      <section class="card">
        <h2>プレイヤー別成績</h2>
        <label class="field">
          <span>プレイヤー</span>
          <select id="stats-player">
            ${this.players
              .map((p) => `<option value="${p.id}" ${p.id === this.state.statsPlayerId ? "selected" : ""}>${esc(p.name)}${p.isMe ? "(自分)" : ""}</option>`)
              .join("")}
          </select>
        </label>
        <div id="player-stat-summary"></div>
        <h3>収支ptの推移</h3>
        <div id="chart-line" class="chart-box"></div>
        <h3>着順分布</h3>
        <div id="chart-bar" class="chart-box"></div>
      </section>

      <section class="card">
        <h2>全プレイヤーランキング</h2>
        <div class="table-scroll">
          <table class="rank-table" id="rank-table"></table>
        </div>
      </section>
    `;

    document.getElementById("stats-period").addEventListener("change", (e) => {
      this.state.statsPeriod = e.target.value;
      this.renderStatsDetails();
    });
    document.getElementById("stats-mode").addEventListener("change", (e) => {
      this.state.statsMode = e.target.value;
      this.renderStatsDetails();
    });
    document.getElementById("stats-player").addEventListener("change", (e) => {
      this.state.statsPlayerId = e.target.value;
      this.renderStatsDetails();
    });

    this.renderStatsDetails();
  },

  renderStatsDetails() {
    const filtered = Calc.filterGames(this.games, {
      period: this.state.statsPeriod,
      mode: this.state.statsMode,
    });

    // プレイヤー個別
    const stats = Calc.aggregatePlayer(this.state.statsPlayerId, filtered, this.rules);
    const summary = document.getElementById("player-stat-summary");
    summary.innerHTML = `
      <div class="stat-grid">
        <div class="stat-tile"><span class="stat-label">対局数</span><span class="stat-value">${stats.gamesCount}</span></div>
        <div class="stat-tile"><span class="stat-label">平均着順</span><span class="stat-value">${Calc.round1(stats.avgRank)}</span></div>
        <div class="stat-tile"><span class="stat-label">和了率</span><span class="stat-value">${Calc.roundPct(stats.agariRate)}</span></div>
        <div class="stat-tile"><span class="stat-label">放銃率</span><span class="stat-value">${Calc.roundPct(stats.houjuuRate)}</span></div>
        <div class="stat-tile wide"><span class="stat-label">合計収支</span><span class="stat-value ${stats.totalPt >= 0 ? "pt-pos" : "pt-neg"}">${Calc.formatPt(stats.totalPt)}pt</span></div>
      </div>
    `;

    const lineData = stats.history.map((h) => ({ label: h.date, value: h.cumulativePt }));
    Charts.renderLineChart(document.getElementById("chart-line"), lineData);

    const maxRank = this.state.statsMode === "sanma" ? 3 : 4;
    const rankLabels = Array.from({ length: maxRank }, (_, i) => i + 1);
    const barData = rankLabels.map((r) => ({ label: r + "着", value: stats.rankDist[r] || 0 }));
    Charts.renderBarChart(document.getElementById("chart-bar"), barData);

    // 全員ランキング
    this.renderRankTable(filtered);
  },

  renderRankTable(filtered) {
    const rows = this.players.map((p) => {
      const s = Calc.aggregatePlayer(p.id, filtered, this.rules);
      return {
        id: p.id,
        name: p.name,
        isMe: p.isMe,
        gamesCount: s.gamesCount,
        avgRank: s.avgRank,
        agariRate: s.agariRate,
        houjuuRate: s.houjuuRate,
        totalPt: s.totalPt,
      };
    });

    const { key, dir } = this.state.rankSort;
    const sorted = rows.slice().sort((a, b) => {
      const av = a[key] == null ? -Infinity : a[key];
      const bv = b[key] == null ? -Infinity : b[key];
      if (key === "avgRank") {
        // 平均着順は小さいほど良い。null(対局なし)は最後に回す
        const av2 = a[key] == null ? Infinity : a[key];
        const bv2 = b[key] == null ? Infinity : b[key];
        return dir === "asc" ? av2 - bv2 : bv2 - av2;
      }
      return dir === "asc" ? av - bv : bv - av;
    });

    const columns = [
      { key: "name", label: "名前", sortable: false },
      { key: "gamesCount", label: "対局数" },
      { key: "avgRank", label: "平均着順", fmt: Calc.round1 },
      { key: "agariRate", label: "和了率", fmt: Calc.roundPct },
      { key: "houjuuRate", label: "放銃率", fmt: Calc.roundPct },
      { key: "totalPt", label: "収支pt", fmt: Calc.formatPt },
    ];

    const table = document.getElementById("rank-table");
    table.innerHTML = `
      <thead>
        <tr>
          ${columns
            .map(
              (c) => `<th data-key="${c.key}" class="${c.sortable === false ? "" : "sortable"} ${key === c.key ? "sorted-" + dir : ""}">${c.label}${c.sortable === false ? "" : key === c.key ? (dir === "asc" ? " ▲" : " ▼") : ""}</th>`
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${sorted
          .map(
            (r) => `
          <tr>
            <td class="rank-name">${esc(r.name)}${r.isMe ? '<span class="badge badge-me badge-xs">自分</span>' : ""}</td>
            <td>${r.gamesCount}</td>
            <td>${Calc.round1(r.avgRank)}</td>
            <td>${Calc.roundPct(r.agariRate)}</td>
            <td>${Calc.roundPct(r.houjuuRate)}</td>
            <td class="${r.totalPt >= 0 ? "pt-pos" : "pt-neg"}">${Calc.formatPt(r.totalPt)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    `;

    table.querySelectorAll("th.sortable").forEach((th) => {
      th.addEventListener("click", () => {
        const k = th.dataset.key;
        if (this.state.rankSort.key === k) {
          this.state.rankSort.dir = this.state.rankSort.dir === "asc" ? "desc" : "asc";
        } else {
          this.state.rankSort = { key: k, dir: k === "avgRank" ? "asc" : "desc" };
        }
        this.renderRankTable(filtered);
      });
    });
  },

  // ---------- バックアップ ----------
  exportData() {
    const data = Store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `mahjong-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.toast("JSONファイルを書き出しました");
  },

  importData(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!confirm("現在のアプリ内のデータをすべて、このファイルの内容で置き換えます。よろしいですか?")) {
          return;
        }
        Store.importAll(data);
        this.players = Store.loadPlayers();
        this.games = Store.loadGames();
        this.rules = Store.loadRules();
        this.toast("データを読み込みました");
        this.render();
      } catch (e) {
        alert("読み込みに失敗しました: " + e.message);
      }
    };
    reader.readAsText(file);
  },
};

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatDateJa(isoDate) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

document.addEventListener("DOMContentLoaded", () => App.init());
