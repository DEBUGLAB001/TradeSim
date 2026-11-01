# Solutions Guide

A complete guide to resolving all 6 bugs in TradeSim: where to find each issue in the code, the exact code changes required, how to see the bug on the frontend, and what changes on the screen after applying the fix.

---

### BUG-01: Single-Trade Policy Returns Zero

* **File:** `src/single_trade_strategy.cpp`
* **Line:** 16

**Original Code:**
```cpp
if (lowest - price > best) { best = lowest - price; buy_day = lowest_day; sell_day = static_cast<int>(day); }
```

**Correct Code:**
```cpp
if (price - lowest > best) { best = price - lowest; buy_day = lowest_day; sell_day = static_cast<int>(day); }
```

* **How to see the bug on frontend:**
  1. Click **Strategy comparison** in the left sidebar (`/comparison.html`).
  2. Set **Market** to `ACME (Volatile)` and **Policy Scope** to `Single Trade`.
  3. Click **Run comparison**.
  4. Notice the row shows **`$0`** Total Profit and **`0`** cycles, even though ACME has huge swings from $90 to $150.
* **What changes after fixing:**
  * Total Profit changes from **`$0`** to **`$60`**.
  * Completed cycles changes from **`0`** to **`1 completed cycle`** (buys on Day 5 at $90 and sells on Day 10 at $150).

---

### BUG-02: Unlimited Trading Loses Money on a Volatile Market

* **File:** `src/unlimited_strategy.cpp`
* **Lines:** 12–15

**Original Code:**
```cpp
while (day + 1 < p.size() && p[day + 1] >= p[day]) ++day;
const auto buy_day = day;
while (day + 1 < p.size() && p[day + 1] <= p[day]) ++day;
const auto sell_day = day;
```

**Correct Code:**
```cpp
while (day + 1 < p.size() && p[day + 1] <= p[day]) ++day;
const auto buy_day = day;
while (day + 1 < p.size() && p[day + 1] >= p[day]) ++day;
const auto sell_day = day;
```

* **How to see the bug on frontend:**
  1. Click **Execution log** in the left sidebar (`/execution.html`).
  2. Set **Market** to `ACME (Volatile)` and **Policy Filter** to `Unlimited Trading`.
  3. Click **Refresh log**.
  4. Notice it buys at peak prices and sells at bottom prices:
     * Day 2 Buy ($120) &rarr; Day 3 Sell ($115) = **-$5 loss**
     * Day 4 Buy ($130) &rarr; Day 5 Sell ($90) = **-$40 loss**
     * Day 7 Buy ($140) &rarr; Day 8 Sell ($100) = **-$40 loss**
     *(Overall return is a negative **-$85**).*
* **What changes after fixing:**
  * In **Execution log**, trades reverse to buying low and selling high on every leg.
  * In **Strategy comparison**, Total Profit jumps from **`-$85`** to **`+$135`** across 4 profitable cycles.

---

### BUG-03: Two-Trade Limit Exceeds Its Cycle Quota

* **File:** `src/limited_transaction_strategy.cpp`
* **Line:** 23

**Original Code:**
```cpp
search(0, 3, 0.0);
```

**Correct Code:**
```cpp
search(0, 2, 0.0);
```

* **How to see the bug on frontend:**
  1. Click **Strategy comparison** in the left sidebar (`/comparison.html`).
  2. Set **Market** to `ACME (Volatile)` and **Policy Scope** to `Two-Trade Limit`.
  3. Click **Run comparison**.
  4. Look at the **Cycles** column: it shows **`3 completed cycles`** (Profit: `$130`), violating the rule of maximum 2 trades.
* **What changes after fixing:**
  * Completed cycles drops from **`3`** to strictly **`2 completed cycles`**.
  * Total Profit changes from **`$130`** to **`$100`**, strictly adhering to the 2-trade risk limit.

---

### BUG-04: Fee-Aware Returns Are Understated

* **File:** `src/fee_strategy.cpp`
* **Lines:** 17 and 21

**Original Code:**
```cpp
// Line 17
buy_cost = prices[day] + fee;

// Line 21
const double net = prices[day] - buy_cost - 2.0 * fee;
```

**Correct Code:**
```cpp
// Line 17
buy_cost = prices[day];

// Line 21
const double net = prices[day] - buy_cost - fee;
```

* **How to see the bug on frontend:**
  1. Click **Strategy comparison** in the left sidebar (`/comparison.html`).
  2. Set **Market** to `ACME (Volatile)` and **Policy Scope** to `Fee-Aware ($2 fee)`.
  3. Click **Run comparison**.
  4. Notice Total Profit is only **`$111`** (too low due to fees charged twice), and the status badge shows a yellow warning **`⚠ Unexpected Result`** with an alert banner above the table.
* **What changes after fixing:**
  * Total Profit increases from **`$111`** to **`$127`** (exactly one $2 fee deducted per cycle).
  * Status changes from yellow warning to green **`✓ Valid Strategy`**.
  * The warning notification banner disappears.

---

### BUG-05: Cooldown Policy Re-enters Too Soon

* **File:** `src/cooldown_strategy.cpp`
* **Lines:** 13 and 18

**Original Code:**
```cpp
// Line 13
if (buy_day < 0 && day >= cooldown_until_day && day + 1 < static_cast<int>(prices.size()) && prices[day] <= prices[day + 1]) {

// Line 18
cooldown_until_day = day + cooldown_days - 1;
```

**Correct Code:**
```cpp
// Line 13
if (buy_day < 0 && day > cooldown_until_day && day + 1 < static_cast<int>(prices.size()) && prices[day] <= prices[day + 1]) {

// Line 18
cooldown_until_day = day + cooldown_days;
```

* **How to see the bug on frontend:**
  1. Click **Execution log** in the left sidebar (`/execution.html`).
  2. Set **Market** to `ACME (Volatile)` and **Policy Filter** to `Cooldown (1 day)`.
  3. Click **Refresh log**.
  4. Look at the top rows: it sells on **Day 2** ($120) and buys back immediately on **Day 3** ($115) without waiting for a 1-day idle window, triggering an **"Unexpected result"** banner.
* **What changes after fixing:**
  * In **Execution log**, after selling on Day 2, it waits a full session (Day 3 is idle) and only enters its next buy on Day 4 or later.
  * In **Strategy comparison**, status turns green into **`✓ Valid Strategy`** with 0 cooldown violations.

---

### BUG-06: Declining Market Produces a Loss-Making Trade

* **File:** `src/unlimited_strategy.cpp`
* **Line:** 16

**Original Code:**
```cpp
if (sell_day > buy_day) {
    trades.push_back({"BUY", static_cast<int>(buy_day), p[buy_day], 0.0});
    trades.push_back({"SELL", static_cast<int>(sell_day), p[sell_day], p[sell_day] - p[buy_day]});
}
```

**Correct Code:**
```cpp
if (sell_day > buy_day && p[sell_day] > p[buy_day]) {
    trades.push_back({"BUY", static_cast<int>(buy_day), p[buy_day], 0.0});
    trades.push_back({"SELL", static_cast<int>(sell_day), p[sell_day], p[sell_day] - p[buy_day]});
}
```

* **How to see the bug on frontend:**
  1. Click **Execution log** in the left sidebar (`/execution.html`).
  2. Set **Market** to `STEEL (Declining)` and **Policy Filter** to `Unlimited Trading`.
  3. Click **Refresh log**.
  4. Notice it executes a loss-making trade in a falling market: buys on Day 1 at $150 and sells on Day 10 at $94, resulting in a loss of **`-$56`**.
* **What changes after fixing:**
  * In **Execution log**, the table shows **`0 EVENTS`** with the message *"No completed transactions in this market period."*
  * Total Profit remains safely at **`$0`**, keeping 100% in cash to protect against losses.
