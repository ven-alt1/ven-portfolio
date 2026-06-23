/* ===========================================================
   EDIT YOUR HOLDINGS HERE
   ticker · name · avg (cost/share) · last (price at last export) · alloc (% of portfolio) · note
   Returns + total are computed automatically from price, so they
   update live once a Finnhub key is set below.
   =========================================================== */
const FINNHUB_TOKEN = "d8npok1r01qvvn99skogd8npok1r01qvvn99skp0";   // finnhub.io key (live quotes)

const meta = { snapshot: "24 Jun 2026" };

const holdings = [
  { ticker: "DRAM", name: "Roundhill Memory ETF",            avg: 54.509,  last: 70.581,  alloc: 25.33, note: "" },
  { ticker: "NOWL", name: "GraniteShares 2x Long NOW ETF",   avg: 4.407,   last: 4.240,   alloc: 10.00, note: "" },
  { ticker: "OUST", name: "Ouster",                          avg: 38.640,  last: 46.900,  alloc:  9.62, note: "" },
  { ticker: "MRVL", name: "Marvell Technology",              avg: 253.445, last: 280.960, alloc:  8.57, note: "" },
  { ticker: "CRDO", name: "Credo Technology",                avg: 228.617, last: 267.045, alloc:  8.50, note: "" },
  { ticker: "NVDA", name: "NVIDIA",                          avg: 174.512, last: 201.026, alloc:  6.45, note: "" },
  { ticker: "TSM",  name: "Taiwan Semiconductor",            avg: 361.360, last: 439.130, alloc:  6.22, note: "" },
  { ticker: "NOK",  name: "Nokia",                           avg: 15.095,  last: 13.697, alloc:  5.64, note: "" },
  { ticker: "URA",  name: "Global X Uranium ETF",            avg: 49.865,  last: 46.245,  alloc:  5.63, note: "" },
  { ticker: "AMBA", name: "Ambarella",                       avg: 86.086,  last: 67.700,  alloc:  5.34, note: "" },
  { ticker: "INFQ", name: "Infleqtion",                      avg: 14.597,  last: 16.060,  alloc:  4.94, note: "" },
  { ticker: "HUMN", name: "Roundhill Humanoid Robotics ETF", avg: 38.110,  last: 34.005,  alloc:  3.49, note: "" }
];
/* =========================================================== */

// price starts at the snapshot value; cost weights derived once so total return stays correct as prices move
holdings.forEach(h => { h.price = h.last; });
const ret0 = (h) => (h.last - h.avg) / h.avg;
const wSum = holdings.reduce((s, h) => s + h.alloc / (1 + ret0(h)), 0);
holdings.forEach(h => { h.costW = (h.alloc / (1 + ret0(h))) / wSum; });

const retOf  = (h) => (h.price - h.avg) / h.avg * 100;
const totalReturn = () => holdings.reduce((s, h) => s + h.costW * retOf(h), 0);
const fmtPct = (n) => (n > 0 ? "+" : "") + n.toFixed(1) + "%";
const usd    = (n) => "$" + n.toFixed(2);
const cls    = (n) => n > 0 ? "pos" : (n < 0 ? "neg" : "");
const maxAlloc = Math.max(1, ...holdings.map(h => h.alloc));

let sortKey = "ret", sortDir = -1;
const valOf = (h, k) => k === "ticker" ? h.ticker : k === "ret" ? retOf(h) : h[k];

function rowHtml(h) {
  const r = retOf(h);
  return `<tr>
    <td><div class="tkr">${h.ticker}</div><div class="nm">${h.name || ""}</div></td>
    <td class="num col-avg">${usd(h.avg)}</td>
    <td class="num"><span class="${cls(h.dp ?? 0)}">${usd(h.price)}</span></td>
    <td class="num"><div class="alloc"><div class="bar"><i style="width:${Math.round((h.alloc / maxAlloc) * 100)}%"></i></div><span class="pct">${h.alloc.toFixed(0)}%</span></div></td>
    <td class="num ${cls(r)}">${fmtPct(r)}</td>
  </tr>`;
}

function paintStats() {
  const t = totalReturn();
  const tot = document.getElementById('totRet');
  tot.textContent = fmtPct(t); tot.className = "v " + cls(t);
  const best = holdings.reduce((a, b) => retOf(b) > retOf(a) ? b : a);
  const tp = document.getElementById('topPerf');
  tp.textContent = best.ticker + " " + fmtPct(retOf(best)); tp.className = "v pos";
  document.getElementById('count').textContent = holdings.length;
}

function paint() {
  const sorted = [...holdings].sort((a, b) => {
    const av = valOf(a, sortKey), bv = valOf(b, sortKey);
    if (typeof av === "string") return sortDir * av.localeCompare(bv);
    return sortDir * (av - bv);
  });
  document.getElementById('rows').innerHTML = sorted.map(rowHtml).join("");
  document.querySelectorAll('thead th').forEach(th => {
    th.classList.toggle('sorted', th.dataset.key === sortKey);
    const a = th.querySelector('.arr'); if (a) a.textContent = sortDir < 0 ? "↓" : "↑";
  });
  const notes = holdings.filter(h => h.note);
  document.getElementById('thesisNote').textContent =
    notes.length ? "Why I hold them — " + notes.map(h => `${h.ticker}: ${h.note}`).join("  ·  ") : "";
  paintStats();
}

document.querySelectorAll('thead th').forEach(th => {
  th.addEventListener('click', () => {
    const k = th.dataset.key;
    if (k === sortKey) { sortDir *= -1; } else { sortKey = k; sortDir = k === "ticker" ? 1 : -1; }
    paint();
  });
});

function setStatus(text, live) {
  const lbl = document.getElementById('liveLabel');
  if (lbl) lbl.textContent = text;
  const dot = document.querySelector('.badge .dot');
  if (dot) dot.style.animation = live ? "pulse 1.4s ease-in-out infinite" : "none";
}

async function refreshPrices() {
  if (!FINNHUB_TOKEN) { setStatus("Snapshot · " + meta.snapshot, false); return; }
  let ok = 0;
  await Promise.all(holdings.map(async h => {
    try {
      const q = await (await fetch(`https://finnhub.io/api/v1/quote?symbol=${h.ticker}&token=${FINNHUB_TOKEN}`)).json();
      if (q && typeof q.c === "number" && q.c > 0) { h.price = q.c; h.dp = q.dp; ok++; }
    } catch (e) { /* keep last good price */ }
  }));
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  setStatus(ok ? "LIVE · " + now : "Snapshot · " + meta.snapshot, ok > 0);
  paint();
}

paint();
refreshPrices();
if (FINNHUB_TOKEN) setInterval(refreshPrices, 20000);
