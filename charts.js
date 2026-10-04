// 依存ライブラリなしの軽量SVGグラフ描画。収支pt推移(折れ線)と着順分布(棒)を描く。
"use strict";

const Charts = {
  // data: [{label, value}, ...] 時系列順
  renderLineChart(container, data, opts) {
    container.innerHTML = "";
    if (!data.length) {
      container.innerHTML = '<p class="chart-empty">データがありません</p>';
      return;
    }
    const width = Math.max(container.clientWidth || 320, 280);
    const height = opts && opts.height ? opts.height : 180;
    const padL = 40, padR = 14, padT = 16, padB = 24;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const values = data.map((d) => d.value);
    let min = Math.min(0, ...values);
    let max = Math.max(0, ...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;

    const xAt = (i) => (data.length === 1 ? padL + plotW / 2 : padL + (plotW * i) / (data.length - 1));
    const yAt = (v) => padT + plotH - ((v - min) / (max - min)) * plotH;
    const zeroY = yAt(0);

    const niceStep = pickNiceStep((max - min) / 4);
    const gridLines = [];
    for (let v = Math.ceil(min / niceStep) * niceStep; v <= max; v += niceStep) {
      gridLines.push(v);
    }

    const points = data.map((d, i) => `${xAt(i)},${yAt(d.value)}`).join(" ");
    const last = data[data.length - 1];
    const lastX = xAt(data.length - 1);
    const lastY = yAt(last.value);

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("class", "chart-svg chart-line");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "収支ptの推移グラフ");

    let svgInner = "";
    // グリッド線
    gridLines.forEach((v) => {
      const y = yAt(v);
      svgInner += `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" class="grid-line" />`;
      svgInner += `<text x="${padL - 6}" y="${y + 3}" class="axis-label" text-anchor="end">${fmtAxis(v)}</text>`;
    });
    // ゼロ基準線
    svgInner += `<line x1="${padL}" y1="${zeroY}" x2="${width - padR}" y2="${zeroY}" class="baseline" />`;
    // 折れ線
    svgInner += `<polyline points="${points}" class="line-path" />`;
    // 各点(タップでツールチップ)
    data.forEach((d, i) => {
      const x = xAt(i);
      const y = yAt(d.value);
      svgInner += `<circle cx="${x}" cy="${y}" r="10" class="hit-target" data-idx="${i}" />`;
      svgInner += `<circle cx="${x}" cy="${y}" r="4" class="dot ${d.value >= 0 ? "dot-pos" : "dot-neg"}" />`;
    });
    // 末尾ラベル
    svgInner += `<text x="${Math.min(lastX, width - padR - 4)}" y="${lastY - 10}" class="end-label" text-anchor="end">${Calc.formatPt(last.value)}pt</text>`;

    svg.innerHTML = svgInner;
    container.appendChild(svg);

    const tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    tooltip.hidden = true;
    container.style.position = "relative";
    container.appendChild(tooltip);

    svg.querySelectorAll(".hit-target").forEach((el) => {
      const show = (ev) => {
        ev.preventDefault();
        const idx = Number(el.getAttribute("data-idx"));
        const d = data[idx];
        tooltip.textContent = `${formatDateShort(d.label)}: ${Calc.formatPt(d.value)}pt`;
        const cx = (xAt(idx) / width) * 100;
        tooltip.style.left = cx + "%";
        const cy = (yAt(d.value) / height) * 100;
        tooltip.style.top = Math.max(cy - 14, 2) + "%";
        tooltip.hidden = false;
      };
      el.addEventListener("click", show);
      el.addEventListener("touchstart", show, { passive: false });
    });

    // 再描画のたびにリスナーが増え続けないよう、前回分を解除してから登録する
    if (container._dismissTooltip) {
      document.removeEventListener("click", container._dismissTooltip);
    }
    const dismissTooltip = (ev) => {
      if (!container.contains(ev.target)) tooltip.hidden = true;
    };
    container._dismissTooltip = dismissTooltip;
    document.addEventListener("click", dismissTooltip);
  },

  // data: [{label, value}, ...]
  renderBarChart(container, data) {
    container.innerHTML = "";
    if (!data.length) {
      container.innerHTML = '<p class="chart-empty">データがありません</p>';
      return;
    }
    const width = Math.max(container.clientWidth || 320, 240);
    const height = 150;
    const padL = 28, padR = 14, padT = 20, padB = 24;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const max = Math.max(1, ...data.map((d) => d.value));

    const n = data.length;
    const slot = plotW / n;
    const barW = Math.min(44, slot * 0.6);

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("class", "chart-svg chart-bar");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "着順分布グラフ");

    let inner = `<line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" class="baseline" />`;

    data.forEach((d, i) => {
      const cx = padL + slot * i + slot / 2;
      const h = max > 0 ? (d.value / max) * (plotH - 6) : 0;
      const y = padT + plotH - h;
      const x = cx - barW / 2;
      inner += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" ry="4" class="bar" />`;
      inner += `<text x="${cx}" y="${y - 6}" class="bar-value" text-anchor="middle">${d.value}</text>`;
      inner += `<text x="${cx}" y="${padT + plotH + 16}" class="axis-label" text-anchor="middle">${d.label}</text>`;
    });

    svg.innerHTML = inner;
    container.appendChild(svg);
  },
};

function pickNiceStep(rough) {
  if (rough <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const n = rough / pow;
  let step;
  if (n <= 1) step = 1;
  else if (n <= 2) step = 2;
  else if (n <= 5) step = 5;
  else step = 10;
  return step * pow;
}

function fmtAxis(v) {
  const r = Math.round(v * 10) / 10;
  return r.toFixed(r % 1 === 0 ? 0 : 1);
}

function formatDateShort(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
