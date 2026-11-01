# TradeSim — Strategy Backtesting & Execution Engine

## 1. Your Mission: Investigate & Fix the Bugs

You are a C++ Developer working on TradeSim, a trading backtesting application designed to help traders evaluate and compare execution strategies against deterministic market histories. The QA team has identified six critical issues affecting strategy returns, trade quotas, and risk validation.

Your responsibility is to investigate the existing codebase, reproduce each issue, identify its root cause, and implement reliable fixes without disrupting existing functionality.

All bug demonstration captures are also archived together in the Catbox Album: https://catbox.moe/c/f89cj8

### BUG-01: Single-Trade Policy Returns Zero

Problem: The Single Trade policy reports $0 profit and no completed cycles on the volatile ACME market, failing to execute any trades despite large price swings.

How to identify it: Open the Strategy Comparison page in the Live Preview. Select the ACME (Volatile) market and the Single Trade policy, then click Run comparison. Observe that the return shows $0 and the completed-cycle count is 0.

Your task: Ensure the policy captures the optimal buy-low and sell-high opportunity in a single completed cycle.

<p align="center">
  <img src="https://files.catbox.moe/4az60u.png" alt="BUG-01: Single-Trade Policy Returns Zero" width="720" />
</p>

### BUG-02: Unlimited Trading Loses Money on a Volatile Market

Problem: The Unlimited Trading policy executes multiple trades on the volatile ACME market but ends with an overall loss of -$85, selling below its entry price on every trade.

How to identify it: Open the Execution Log page in the Live Preview. Select the ACME (Volatile) market and the Unlimited Trading policy, then click Refresh log. Inspect the trade entries and exits to see that it buys at high prices and sells at lower prices.

Your task: Ensure the policy buys during price valleys and sells at price peaks, capturing profitable runs without selling at a loss.

<p align="center">
  <img src="https://files.catbox.moe/kzp14v.png" alt="BUG-02: Unlimited Trading Loses Money on a Volatile Market" width="720" />
</p>

### BUG-03: Two-Trade Limit Exceeds Its Cycle Quota

Problem: The Two-Trade Limit policy executes and completes three full round-trip cycles on the ACME market, exceeding the maximum allowed limit of two trades.

How to identify it: Open the Strategy Comparison page in the Live Preview. Select the ACME (Volatile) market and the Two-Trade Limit policy, then click Run comparison. Check the Cycles column to see that it reports 3 completed cycles instead of 2.

Your task: Ensure the policy strictly respects the two-trade quota and completes no more than two round-trip cycles.

<p align="center">
  <img src="https://files.catbox.moe/ols7hy.png" alt="BUG-03: Two-Trade Limit Exceeds Its Cycle Quota" width="720" />
</p>

### BUG-04: Fee-Aware Returns Are Understated

Problem: The Fee-Aware ($2 fee) policy reports a net profit of $111 instead of the expected $127 on the ACME market, causing the application to flag it with an "Unexpected Result" warning status.

How to identify it: Open the Strategy Comparison page in the Live Preview. Select the ACME (Volatile) market and the Fee-Aware ($2 fee) policy, then click Run comparison. Observe that the total profit reads $111 and the status badge shows a yellow "Unexpected Result" warning.

Your task: Ensure the flat $2 fee is applied only once per completed trade cycle, producing the correct net return of $127 and a valid strategy status.

<p align="center">
  <img src="https://files.catbox.moe/ft0tun.png" alt="BUG-04: Fee-Aware Returns Are Understated" width="720" />
</p>

### BUG-05: Cooldown Policy Re-enters Too Soon

Problem: The Cooldown (1 day) policy buys into a new position on the session immediately following a sale, without observing the required full idle day, which triggers an "Unexpected Result" warning.

How to identify it: Open the Execution Log page in the Live Preview. Select the ACME (Volatile) market and the Cooldown (1 day) policy, then click Refresh log. Look at the first sale on Day 2 and the immediate buy on Day 3, with an anomaly notice shown above the table.

Your task: Ensure the policy enforces one full idle day after each sale before opening a new position.

<p align="center">
  <img src="https://files.catbox.moe/cob7dj.png" alt="BUG-05: Cooldown Policy Re-enters Too Soon" width="720" />
</p>

### BUG-06: Declining Market Produces a Loss-Making Trade

Problem: In the steadily declining STEEL market, the Unlimited Trading policy opens and closes a position at a loss of -$56 instead of remaining safely in cash.

How to identify it: Open the Execution Log page in the Live Preview. Select the STEEL (Declining) market and the Unlimited Trading policy, then click Refresh log. Notice that it records a buy on Day 1 ($150) and a sell on Day 10 ($94), resulting in a -$56 loss.

Your task: Ensure the policy avoids entering trades when no profitable opportunities exist in a declining market, completing 0 trades and reporting $0 profit.

<p align="center">
  <img src="https://files.catbox.moe/b1ixfh.png" alt="BUG-06: Declining Market Produces a Loss-Making Trade" width="720" />
</p>

## 2. Get Familiar With the Application

TradeSim is a lightweight backtesting platform that provides an interactive interface for evaluating algorithmic trading strategies against historical market data.

Core Features:

Market Histories: Test policies against volatile (ACME), trending (NOVA), and declining (STEEL) market price series.

Strategy Comparison: Compare returns, trade counts, drawdowns, and validity across different trading policies side by side.

Execution Log: Review a chronological timeline of every buy and sell order, session day, fill price, and realized profit.

Risk Telemetry: Track maximum drawdowns and verify that strategies adhere to required trading rules.

Scenario Controls: Reset views and re-run backtests on demand.

Three-Page Workspace: Switch between Overview, Strategy Comparison, and Execution Log from the navigation sidebar.

## 3. Expected Behaviour After Fixing the Bugs

Once all reported issues have been resolved, the application should behave as follows:

Single Trade: Captures the optimal buy-low and sell-high spread on ACME in one trade for $60 profit.

Unlimited Trading: Captures all profitable price rises on ACME for $135 profit without selling below the entry price.

Two-Trade Limit: Completes no more than two trades and earns $100 profit on ACME.

Fee-Aware Strategy: Deducts exactly one $2 fee per completed trade cycle, reporting $127 net profit with a valid strategy status.

Cooldown Policy: Waits one full idle day after each sale before re-entering, with no cooldown violations.

Declining Market: Completes zero trades and reports $0 profit on declining STEEL, remaining safely in cash.

All existing application functionality must continue working as expected.

## 4. Integrated Terminal Commands

Your workspace provides an integrated terminal to execute the following commands:

Start the Development Server

```bash
sh start.sh
```

Starts the TradeSim application locally so you can interact with it through the Live Preview. (On Windows: run `.\build\tradesim.exe`).

Run Automated Tests

```bash
bash tests/run_tests.sh
```

Executes the available automated test suite to verify your implementation and identify unresolved issues. (On Windows: run `.\build\tests\run_tests.exe`).

Use the Live Preview alongside the terminal to observe application behaviour and verify your changes.

## 5. Workspace Guidelines & Submission

You have access to the complete application codebase, an interactive Live Preview, an integrated terminal, and an AI-powered coding assistant.

Available Workspace Tools:

Code Editor: Explore and modify the existing source code.

Live Preview: Interact with the application and reproduce the six reported bugs.

Integrated Terminal: Start the development server and execute automated tests.

AI Assistant: Ask for explanations, debugging guidance, and help understanding unfamiliar code.

Hard Reset Policy:

The workspace includes a Hard Reset option that restores the challenge to its original state.

Maximum of 2 Hard Reset activations.

A minimum cooldown of 10 minutes between consecutive activations.

Resetting discards your current code changes and restores the original challenge files.

Use Hard Reset carefully, as your progress will be lost.

Before Submission:

Resolve all six reported bugs.

Verify the fixes through the Live Preview.

Run the automated tests.

Ensure existing application functionality remains intact.

Once satisfied, submit your implementation through DEBUG//LAB.

Your solution will be evaluated using automated test cases, including hidden test cases that verify the correctness of your implementation.
