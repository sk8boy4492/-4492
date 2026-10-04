// localStorageへの読み書きをまとめたモジュール。
"use strict";

const STORAGE_KEYS = {
  players: "mahjong_players_v1",
  games: "mahjong_games_v1",
  rules: "mahjong_rules_v1",
};

const DEFAULT_RULES = {
  yonma: { start: 25000, return: 30000, uma: [20, 10, -10, -20], oka: 20 },
  sanma: { start: 35000, return: 40000, uma: [20, 0, -20], oka: 15 },
};

function genId() {
  if (window.crypto && window.crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch (e) {
    console.error("読み込みに失敗しました:", key, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

const Store = {
  loadPlayers() {
    return readJSON(STORAGE_KEYS.players, []);
  },
  savePlayers(players) {
    writeJSON(STORAGE_KEYS.players, players);
  },
  loadGames() {
    return readJSON(STORAGE_KEYS.games, []);
  },
  saveGames(games) {
    writeJSON(STORAGE_KEYS.games, games);
  },
  loadRules() {
    const saved = readJSON(STORAGE_KEYS.rules, null);
    if (!saved) return JSON.parse(JSON.stringify(DEFAULT_RULES));
    // 旧データに欠けている項目があればデフォルトで補う
    return {
      yonma: Object.assign({}, DEFAULT_RULES.yonma, saved.yonma || {}),
      sanma: Object.assign({}, DEFAULT_RULES.sanma, saved.sanma || {}),
    };
  },
  saveRules(rules) {
    writeJSON(STORAGE_KEYS.rules, rules);
  },

  exportAll() {
    return {
      type: "mahjong-app-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      players: this.loadPlayers(),
      games: this.loadGames(),
      rules: this.loadRules(),
    };
  },

  importAll(data) {
    if (!data || typeof data !== "object") {
      throw new Error("ファイルの形式が正しくありません");
    }
    if (!Array.isArray(data.players) || !Array.isArray(data.games)) {
      throw new Error("バックアップファイルの内容が不完全です");
    }
    this.savePlayers(data.players);
    this.saveGames(data.games);
    if (data.rules) this.saveRules(data.rules);
  },
};
