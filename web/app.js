const byId = (id) => document.getElementById(id);
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
let appState = null;
let selectedResults = [];

async function getJson(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

function setNotice(message, visible = true, tone = "info") {
  const notice = byId("notice");
  if (!notice) return;
  notice.textContent = message;
  notice.classList.toggle("hidden", !visible);
  notice.classList.remove("notice-info", "notice-success", "notice-warning", "notice-error");
  notice.classList.add(`notice-${tone}`);
}

function populateControls(state) {
  const ticker = byId("ticker-select");
  ticker.innerHTML = state.markets.map((market) => `<option value="${market.ticker}">${market.name}</option>`).join("");
  const strategy = byId("strategy-select");
  strategy.innerHTML = '<option value="all">Strategy Comparison (All)</option>' +
    state.strategies.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
  const params = new URLSearchParams(window.location.search);
  const qTicker = params.get("ticker") || params.get("market");
  const qStrategy = params.get("strategy");
  const savedTicker = localStorage.getItem("tradesim-ticker");
  const savedStrategy = localStorage.getItem("tradesim-strategy");
  if (qTicker && state.markets.some((m) => m.ticker === qTicker)) ticker.value = qTicker;
  else if (savedTicker && state.markets.some((market) => market.ticker === savedTicker)) ticker.value = savedTicker;
  if (qStrategy && (qStrategy === "all" || state.strategies.some((item) => item.id === qStrategy))) strategy.value = qStrategy;
  else if (savedStrategy && (savedStrategy === "all" || state.strategies.some((item) => item.id === savedStrategy))) strategy.value = savedStrategy;
}

function renderChart(prices, ticker) {
  const sessionCount = byId("session-count");
  if (sessionCount) sessionCount.textContent = `${prices.length} sessions`;
  if (!byId("price-chart")) return;
  byId("chart-title").textContent = `${ticker} · Daily closing price`;
  const chartPeriod = document.querySelector(".chart-period");
  if (chartPeriod) chartPeriod.textContent = `${prices.length} SESSIONS`;
  const svg = byId("price-chart");
  const lastClose = prices.at(-1);
  const change = prices.length > 1 && prices[0] !== 0 ? ((lastClose - prices[0]) / prices[0]) * 100 : 0;
  const latestClose = byId("market-last");
  const marketChange = byId("market-change");
  if (latestClose) latestClose.textContent = lastClose === undefined ? "—" : money.format(lastClose);
  if (marketChange) {
    marketChange.textContent = `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
    marketChange.setAttribute("aria-label", `${change > 0 ? "Up" : change < 0 ? "Down" : "Unchanged"} ${Math.abs(change).toFixed(1)} percent since the first session`);
    marketChange.className = `quote-change ${change >= 0 ? "positive" : "negative"}`;
  }
  if (!prices.length) { svg.innerHTML = ""; byId("chart-ylabels").innerHTML = ""; byId("chart-xlabels").innerHTML = ""; return; }
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = Math.max(max - min, 1);
  const padMin = min - range * 0.12, padMax = max + range * 0.12;
  const points = prices.map((price, index) => {
    const x = prices.length === 1 ? 480 : 8 + index * 944 / (prices.length - 1);
    const y = 207 - (price - padMin) * 194 / (padMax - padMin);
    return [x, y];
  });
  const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(1)} 214 L${points[0][0].toFixed(1)} 214 Z`;
  const last = points[points.length - 1];
  const markers = points.map(([x, y], index) => `<circle class="price-point" cx="${x}" cy="${y}" r="3" tabindex="0" role="img" aria-label="Day ${index + 1} closing price ${money.format(prices[index])}"><title>Day ${index + 1} · ${money.format(prices[index])}</title></circle>`).join("");
  svg.innerHTML = `<defs><linearGradient id="price-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#70d4a9" stop-opacity=".22"/><stop offset="1" stop-color="#70d4a9" stop-opacity="0"/></linearGradient></defs><path class="price-area" d="${area}"/><path class="price-line" d="${line}"/>${markers}<circle class="price-dot" cx="${last[0]}" cy="${last[1]}" r="4"/>`;
  byId("chart-ylabels").innerHTML = [1, .66, .33, 0].map((part) => `<span>${money.format(padMin + part * (padMax - padMin))}</span>`).join("");
  const labels = prices.map((_, index) => `D${index + 1}`);
  const maxLabels = Math.min(labels.length, 6);
  const xLabels = Array.from({ length: maxLabels }, (_, i) => labels[Math.round(i * (labels.length - 1) / Math.max(maxLabels - 1, 1))]);
  byId("chart-xlabels").innerHTML = xLabels.map((label) => `<span>${label}</span>`).join("");
}

function renderComparison(results) {
  const strategyRows = byId("strategy-rows");
  if (strategyRows) strategyRows.innerHTML = results.map((result) => `
    <tr>
      <td><span class="strategy-name">${result.strategy}</span><span class="strategy-sub">${result.transactions} completed cycle${result.transactions === 1 ? "" : "s"}</span></td>
      <td class="money ${result.totalProfit >= 0 ? "positive" : "negative"}">${money.format(result.totalProfit)}</td>
      <td>${result.transactions}</td>
      <td class="money">${money.format(result.maxDrawdown)}</td>
      <td><span class="status-pill ${result.valid ? "good" : "bad"}"><i></i>${result.valid ? "✓ Valid Strategy" : "⚠ Unexpected Result"}</span></td>
    </tr>`).join("");

  const returns = results.map((result) => result.totalProfit);
  const drawdowns = results.map((result) => result.maxDrawdown);
  const anomalies = results.filter((result) => !result.valid).length;
  if (byId("metric-profit")) byId("metric-profit").textContent = money.format(Math.max(0, ...returns));
  if (byId("metric-profit-note")) byId("metric-profit-note").textContent = `Highest return across ${results.length} selected polic${results.length === 1 ? "y" : "ies"}`;
  if (byId("metric-trades")) byId("metric-trades").textContent = results.reduce((sum, result) => sum + result.transactions, 0).toLocaleString("en-US");
  if (byId("metric-trades-note")) byId("metric-trades-note").textContent = `Across ${results.length} selected polic${results.length === 1 ? "y" : "ies"}`;
  if (byId("metric-drawdown")) byId("metric-drawdown").textContent = money.format(Math.max(0, ...drawdowns));
  if (byId("metric-drawdown-note")) byId("metric-drawdown-note").textContent = "Largest observed market pullback";
  if (byId("metric-health")) {
    byId("metric-health").textContent = anomalies ? `${anomalies} anomaly flag${anomalies === 1 ? "" : "s"}` : "All policies valid";
    byId("metric-health").className = `metric-value health-value ${anomalies ? "unexpected" : "healthy"}`;
  }
  if (byId("metric-health-note")) byId("metric-health-note").textContent = anomalies ? "Review execution traces below" : "No policy invariants breached";
  if (anomalies) setNotice(`${anomalies} selected strateg${anomalies === 1 ? "y reports" : "ies report"} an unexpected result. Inspect the execution trace and compare the policy rules.`, true, "warning");
  else setNotice("Backtest complete. All selected policies satisfy the execution checks.", true, "success");
}

function renderTransactions(results) {
  if (!byId("transaction-rows")) return;
  const events = [];
  for (const result of results) for (const trade of result.trades) events.push({ ...trade, strategy: result.strategy });
  events.sort((a, b) => a.day - b.day || a.strategy.localeCompare(b.strategy));
  byId("transaction-count").textContent = `${events.length} EVENTS`;
  byId("transaction-rows").innerHTML = events.length ? events.map((trade) => `
    <tr>
      <td class="strategy-name">${trade.strategy}</td>
      <td><span class="action-pill ${trade.action.toLowerCase()}">${trade.action}</span></td>
      <td class="session-cell">DAY ${trade.day + 1}</td>
      <td class="price-cell">${money.format(trade.price)}</td>
      <td class="money ${trade.action === "SELL" && trade.realizedProfit >= 0 ? "positive" : trade.realizedProfit < 0 ? "negative" : ""}">${trade.action === "SELL" ? money.format(trade.realizedProfit) : "—"}</td>
    </tr>`).join("") : '<tr><td colspan="5" class="empty-cell">No completed transactions in this market period.</td></tr>';
}

async function runBacktest() {
  const button = byId("run-button");
  const idleMarkup = button.innerHTML;
  button.disabled = true;
  button.textContent = "Running backtest…";
  try {
    const payload = { ticker: byId("ticker-select").value, strategy: byId("strategy-select").value };
    localStorage.setItem("tradesim-ticker", payload.ticker);
    localStorage.setItem("tradesim-strategy", payload.strategy);
    const result = await getJson("/api/backtest", { method: "POST", body: JSON.stringify(payload) });
    selectedResults = result.results;
    renderChart(result.prices, result.ticker);
    renderComparison(result.results);
    renderTransactions(result.results);
    byId("engine-status").textContent = `Feed active · ${result.ticker}`;
    applyBugAnnotation();
  } catch (error) {
    byId("engine-status").textContent = "Request failed";
    setNotice(`Unable to run backtest: ${error.message}`, true, "error");
  } finally {
    button.disabled = false;
    button.innerHTML = idleMarkup;
  }
}

async function resetScenario() {
  const button = byId("reset-button");
  button.disabled = true;
  try {
    await getJson("/api/reset", { method: "POST", body: "{}" });
    byId("ticker-select").value = "ACME_TECH";
    byId("strategy-select").value = "all";
    await runBacktest();
  } catch (error) {
    setNotice(`Unable to reset the scenario: ${error.message}`, true, "error");
  } finally {
    button.disabled = false;
  }
}

function applyBugAnnotation() {
  const params = new URLSearchParams(window.location.search);
  const bugId = params.get("bug");
  if (!bugId) return;

  document.querySelectorAll(".bug-annotation-card, .bug-annotation-overlay").forEach((el) => el.remove());

  const wrap = document.querySelector(".content-wrap");
  if (!wrap) return;
  wrap.style.position = "relative";

  const overlayContainer = document.createElement("div");
  overlayContainer.className = "bug-annotation-overlay";
  overlayContainer.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:90;";
  wrap.appendChild(overlayContainer);

  const wrapRect = wrap.getBoundingClientRect();

  function highlight(el, label, pos = "top") {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const top = r.top - wrapRect.top - 5;
    const left = r.left - wrapRect.left - 6;
    const width = r.width + 12;
    const height = r.height + 10;

    const box = document.createElement("div");
    box.style.cssText = `position:absolute;top:${top}px;left:${left}px;width:${width}px;height:${height}px;border:2.5px dashed #ef4444;border-radius:6px;box-shadow:0 0 16px rgba(239,68,68,0.5);pointer-events:none;z-index:95;`;

    if (label) {
      const tag = document.createElement("span");
      const isBottom = pos === "bottom";
      tag.style.cssText = `position:absolute;${isBottom ? 'bottom:-12px' : 'top:-12px'};left:14px;background:#ef4444;color:#ffffff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.4);letter-spacing:0.02em;white-space:nowrap;font-family:system-ui,-apple-system,sans-serif;`;
      tag.innerHTML = label;
      box.appendChild(tag);
    }
    overlayContainer.appendChild(box);
  }

  function highlightRows(rowStart, rowEnd, label, pos = "top") {
    const table = document.querySelector("table");
    if (!table) return;
    const rows = table.querySelectorAll("tbody tr");
    if (!rows.length || rowStart >= rows.length) return;
    const start = rows[rowStart];
    const end = (rowEnd < rows.length ? rows[rowEnd] : rows[rows.length - 1]) || start;
    const r1 = start.getBoundingClientRect();
    const r2 = end.getBoundingClientRect();
    const top = r1.top - wrapRect.top - 4;
    const left = Math.min(r1.left, r2.left) - wrapRect.left - 6;
    const width = Math.max(r1.width, r2.width) + 12;
    const height = (r2.bottom - r1.top) + 8;

    const box = document.createElement("div");
    box.style.cssText = `position:absolute;top:${top}px;left:${left}px;width:${width}px;height:${height}px;border:2.5px dashed #ef4444;border-radius:6px;box-shadow:0 0 16px rgba(239,68,68,0.5);pointer-events:none;z-index:95;`;

    if (label) {
      const tag = document.createElement("span");
      const isBottom = pos === "bottom";
      tag.style.cssText = `position:absolute;${isBottom ? 'bottom:-12px' : 'top:-12px'};left:14px;background:#ef4444;color:#ffffff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.4);letter-spacing:0.02em;white-space:nowrap;font-family:system-ui,-apple-system,sans-serif;`;
      tag.innerHTML = label;
      box.appendChild(tag);
    }
    overlayContainer.appendChild(box);
  }

  function addCard(badge, title, desc) {
    const card = document.createElement("div");
    card.className = "bug-annotation-card";
    card.style.cssText = `position:absolute;top:10px;right:24px;width:380px;background:#0d1322;border:1px solid #2a3854;border-radius:10px;padding:12px 15px;box-shadow:0 15px 30px -5px rgba(0,0,0,0.6),0 0 20px rgba(239,68,68,0.15);z-index:110;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;pointer-events:auto;`;
    card.innerHTML = `
      <div style="display:inline-block;background:#ef4444;color:#ffffff;font-size:9.5px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:3px 8px;border-radius:4px;margin-bottom:6px;">${badge}</div>
      <div style="font-size:13px;font-weight:700;color:#ffffff;margin-bottom:4px;display:flex;align-items:center;gap:6px;"><span style="color:#ef4444;font-size:11px;">🔴</span> ${title}</div>
      <div style="font-size:10.5px;color:#94a3b8;line-height:1.45;">${desc}</div>
    `;
    wrap.appendChild(card);
  }

  const bugNum = parseInt(bugId, 10);
  if (bugNum === 1) {
    addCard(
      "BUG 1 VISUAL DEMONSTRATION",
      "Single-Trade Policy Returns Zero",
      "Profit delta evaluates in reverse (lowest - price), so best is never updated. Reports $0 profit and 0 completed cycles instead of capturing the $60 spread on ACME (Buy Day 5 @ $90, Sell Day 10 @ $150)."
    );
    const row = document.querySelector("#strategy-rows tr");
    if (row) {
      highlight(row, "❌ Reports $0 Profit &amp; 0 Completed Cycles (Expected: $60.00 Profit in 1 Cycle)");
    }
  } else if (bugNum === 2) {
    addCard(
      "BUG 2 VISUAL DEMONSTRATION",
      "Inverted Monotonic Checks (Buying High, Selling Low)",
      "Loop conditions advance while prices rise to buy at local peaks and while prices fall to sell at local troughs, accumulating -$85 in total losses across 3 cycles on ACME."
    );
    highlightRows(0, 1, "❌ Cycle 1: Bought peak at $120 &rarr; Sold dip at $115 (-$5 Loss)");
    highlightRows(2, 3, "❌ Cycle 2: Bought peak at $130 &rarr; Sold dip at $90 (-$40 Loss)");
    highlightRows(4, 5, "❌ Cycle 3: Bought peak at $140 &rarr; Sold dip at $100 (-$40 Loss)");
  } else if (bugNum === 3) {
    addCard(
      "BUG 3 VISUAL DEMONSTRATION",
      "Transaction Quota Breach (3 Cycles Executed)",
      "Search depth is initialized with 3 cycles instead of 2 (search(0, 3, 0.0)), violating executive risk controls that restrict execution to at most 2 completed cycles."
    );
    const row = document.querySelector("#strategy-rows tr");
    if (row) {
      highlight(row, "❌ 3 Cycles Completed — Exceeds Mandated Maximum of 2 Cycles! ($130 Profit)");
    }
  } else if (bugNum === 4) {
    addCard(
      "BUG 4 VISUAL DEMONSTRATION",
      "Double-Deducted Settlement Fees &amp; Unexpected Result",
      "A $2 flat fee is added to buy_cost at entry and subtracted twice again at exit (2.0 * fee). Over 4 cycles, $32 is charged instead of $8, dropping profit to $111 and triggering an anomaly badge."
    );
    const notice = document.querySelector("#notice");
    if (notice && !notice.classList.contains("hidden")) {
      highlight(notice, "⚠ Telemetry Anomaly: Strategy reports unexpected result");
    }
    const row = document.querySelector("#strategy-rows tr");
    if (row) {
      highlight(row, "❌ Profit Understated: $111 (Expected: $127) &bull; ⚠ Unexpected Result Flag");
    }
  } else if (bugNum === 5) {
    addCard(
      "BUG 5 VISUAL DEMONSTRATION",
      "Mandatory 1-Day Cooldown Window Violated",
      "Off-by-one boundary comparison allows immediate repurchase on the next session without an intervening idle day. Telemetry flags an unexpected result anomaly."
    );
    const notice = document.querySelector("#notice");
    if (notice && !notice.classList.contains("hidden")) {
      highlight(notice, "⚠ Invariant Breach: Cooldown period violated");
    }
    highlightRows(1, 2, "❌ Immediate Re-entry: Sold Day 2 ($120) &rarr; Re-bought Day 3 ($115) with 0 idle days!");
  } else if (bugNum === 6) {
    addCard(
      "BUG 6 VISUAL DEMONSTRATION",
      "Loss-Making Trade in Monotonically Declining Market",
      "Strategy lacks validation ensuring sell price exceeds buy price, executing an entry on Day 1 ($150) and exit on Day 10 ($94) on declining STEEL for a -$56 loss."
    );
    highlightRows(0, 1, "❌ Bought Day 1 @ $150 &rarr; Sold Day 10 @ $94 (-$56 Realized Loss)");
  }
}

async function boot() {
  try {
    appState = await getJson("/api/state");
    populateControls(appState);
    byId("engine-status").textContent = "Feed active · ACME_TECH";
    byId("ticker-select").addEventListener("change", runBacktest);
    byId("strategy-select").addEventListener("change", runBacktest);
    byId("run-button").addEventListener("click", runBacktest);
    byId("reset-button").addEventListener("click", resetScenario);
    await runBacktest();
  } catch (error) {
    byId("engine-status").textContent = "Engine unavailable";
    setNotice(`Could not connect to the TradeSim C++ service. Start it with ./start.sh. ${error.message}`, true, "error");
  }
}

boot();
