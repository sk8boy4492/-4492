// 手描きのSVGアイコンセット。絵文字の代わりに使う(currentColorで着色されるため、
// 置き場所のCSSのcolorプロパティで色を指定する)。
"use strict";

const Icons = {
  write: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z"/></svg>`,

  history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h10a3 3 0 0 1 3 3v13H8a2 2 0 0 1-2-2V4z"/><path d="M6 4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>`,

  stats: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="13" width="4" height="7" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="16" y="3" width="4" height="17" rx="1"/></svg>`,

  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.97 7.97 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a8 8 0 0 0-1.7-1L14.9 3h-4l-.4 2.6a8 8 0 0 0-1.7 1l-2.5-1-2 3.4L6.4 11a7.97 7.97 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a8 8 0 0 0 1.7 1l.4 2.6h4l.4-2.6a8 8 0 0 0 1.7-1l2.5 1 2-3.4L19.4 13z"/></svg>`,

  player: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></svg>`,

  backup: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4.5 4.5 0 0 1-1-8.9A5.5 5.5 0 0 1 16.4 8 4 4 0 0 1 17 16H7z"/><polyline points="9.5 13.5 12 16 14.5 13.5"/><line x1="12" y1="10" x2="12" y2="16"/></svg>`,

  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 5H5a2 2 0 0 0 2 4"/><path d="M16 5h3a2 2 0 0 1-2 4"/><line x1="12" y1="13" x2="12" y2="16.5"/><path d="M9 20h6l-.8-3.5h-4.4z"/></svg>`,

  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>`,

  flame: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-3 4-3 7a3 3 0 0 0 6 0c0-1-1-1.5-1-2.5 1.5 1 2.5 3 2.5 5a5.5 5.5 0 1 1-11 0C5.5 7 8 5 12 2z"/></svg>`,

  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z"/></svg>`,

  wave: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>`,

  scale: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="19"/><line x1="5" y1="7" x2="19" y2="7"/><path d="M5 7l-3 6a3 3 0 0 0 6 0L5 7z"/><path d="M19 7l-3 6a3 3 0 0 0 6 0l-3-6z"/><path d="M9 19h6"/></svg>`,

  hourglass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 21h12M7 3c0 5 5 7 5 9s-5 4-5 9M17 3c0 5-5 7-5 9s5 4 5 9"/></svg>`,

  star: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9 5.8 20.3l1.6-6.8L2.2 8.9l6.9-.6L12 2z"/></svg>`,

  starOutline: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9 5.8 20.3l1.6-6.8L2.2 8.9l6.9-.6L12 2z"/></svg>`,

  // 麻雀牌をかたどった装飾アイコン(固定色。テーマに関わらず牌らしい白色を保つ)
  tile: `<svg viewBox="0 0 24 24"><rect x="3" y="2" width="18" height="20" rx="3" fill="#fffdf8" stroke="#9c8f7f" stroke-width="1.2"/><circle cx="8.3" cy="8" r="2" fill="#d03b3b"/><circle cx="15.7" cy="8" r="2" fill="#d03b3b"/><circle cx="8.3" cy="16" r="2" fill="#d03b3b"/><circle cx="15.7" cy="16" r="2" fill="#d03b3b"/><circle cx="12" cy="12" r="2" fill="#d03b3b"/></svg>`,
};

// 5段階の星レーティング(filledCount個を塗りつぶし)のHTML断片を作る。
function starRatingHtml(filledCount, total) {
  total = total || 5;
  let html = "";
  for (let i = 1; i <= total; i++) {
    html += `<span class="star-icon ${i <= filledCount ? "star-filled" : "star-empty"}">${i <= filledCount ? Icons.star : Icons.starOutline}</span>`;
  }
  return html;
}
