# Automated Trading — Configuration & Architecture

> **⚠️ This repository is PUBLIC** (it's the GitHub profile repo). Paper-phase
> config is fine here, but real-money journal data (positions, P&L) must live in a
> **private** repo before Phase 2. API keys never go in any repo — they live only in
> the Claude Code environment's secrets.

## What this is

A daily, rules-driven trading routine with a **$1,000 budget**: monitor a fixed
universe of tickers, buy dips per `strategy.yaml`, exit at profit/loss/time
thresholds, and split realized gains between redeployable capital and a cash reserve.

| Responsibility | Owner |
|---|---|
| Strategy rules, budget, risk limits | **Human** (via `strategy.yaml`) |
| Daily monitoring, dip detection, order sizing, journaling | Claude routine |
| Paper-trade execution | Claude routine (autonomous) |
| **Live-trade execution** | Claude proposes → **human approves each order** |
| Deposits, withdrawals, transfers | **Human only**, never exposed to tooling |

## Components

1. **Brokerage: Alpaca.** API-first, commission-free, fractional shares, and paper
   trading that mirrors live. Fund the live account with exactly the budget, so
   nothing outside it is reachable.

2. **MCP servers ([`.mcp.json`](../.mcp.json)).** The official
   [`alpaca-mcp-server`](https://github.com/alpacahq/alpaca-mcp-server), split by mode:
   - `alpaca-paper`: paper endpoint hard-coded, keys from `ALPACA_PAPER_*` secrets.
   - `alpaca-live` (added in Phase 2): live endpoint, keys from `ALPACA_LIVE_*`.

   Paper keys don't work on the live endpoint and vice versa, so a misplaced key
   fails with a 401. It can't place a trade in the wrong account.

3. **Permissions ([`.claude/settings.json`](../.claude/settings.json)).** Every
   `alpaca-paper` tool is auto-allowed, so paper runs unattended. Live order tools are
   on the `ask` list. Options, crypto, order replacement, close-all, and account-config
   changes are denied on both servers.

4. **Guard hook (`guard.py`).** Runs before every Alpaca tool call and checks
   orders against `strategy.yaml` in code, not just in the prompt:
   ticker allowlist, buy order type, per-trade dollar cap, max buys per day, no
   extended hours, server/mode match, and kill switches (`trading/HALT` file or
   `halt: true` in `journal/state.json`). In live mode it **forces an approval
   prompt** on every order, whatever the session's permission mode. Any error blocks
   the call.

5. **Rulebook (`strategy.yaml`).** Starter values sized for $1,000: 4 slots of $200,
   $200 buffer, 30% of realized gains to reserve. `strategy.template.yaml` is the
   blank copy.

6. **Routine.** A scheduled session on market days at 10:12 ET. Scheduled with
   `CRON_TZ=America/New_York`, so DST is handled. It follows `routine-prompt.md`.

7. **Journal (`journal/`).** `state.json`, `trades.csv`, `guard-log.jsonl`, and one
   report per run. It's committed every run so each fresh session has continuity.

8. **Backtester (`backtest.py`).** Replays `strategy.yaml` over Yahoo daily bars.
   `python3 trading/backtest.py --years 3 [--trades]`

## Backtest: starter rules, Dec 2023 – Oct 2026, $1,000

| Universe | Strategy | SPY buy & hold | Strategy max DD | Trades | Win rate |
|---|---|---|---|---|---|
| Starter (7 ETFs + 6 mega-caps) | **+56.2%** | +68.4% | 13.3% | 217 | 52% |
| ETFs only | **+23.0%** | +68.4% | 8.9% | 100 | 60% |

Neither version beat buying SPY and holding it. The starter list's edge comes mostly
from mega-caps that were picked with hindsight. The rules also leave money idle: at
most $800 is deployed in $200 slots, and ETFs rarely fall 5%. The drawdowns are
smaller, though. Not modeled: slippage, the earnings filter, loss halts, and
short-term capital-gains tax. Tune the rules here first, then confirm in paper trading.

## Phases

- **Phase 0, configuration.** ✅ MCP, permissions, guard, rulebook, backtester.
- **Phase 1, paper (2–4+ weeks).** The routine runs autonomously against a paper
  account reset to $1,000. The journal shows whether the rules work on live data.
- **Phase 2, live, approval-gated.** Requires a private repo, the `alpaca-live`
  server, and `mode: live`. The guard forces a human prompt on every order.

## Setup checklist (human steps)

1. Create an Alpaca account. In the paper dashboard, **reset the paper balance to
   $1,000** so sizing and buying power match the real budget, and turn **shorting
   off** in the account configuration.
2. Generate **paper** API keys. In the Claude Code environment settings, add the
   secrets `ALPACA_PAPER_API_KEY` and `ALPACA_PAPER_SECRET_KEY`.
3. Make sure the environment's network policy allows `paper-api.alpaca.markets`,
   `data.alpaca.markets` (and `api.alpaca.markets` for Phase 2).
4. Start a session. The routine smoke-tests the connection, then gets scheduled.

## Risk notes

- **PDT rule:** FINRA's $25k pattern-day-trader minimum was replaced by an intraday
  margin rule (effective June 4, 2026), and Alpaca's docs say trade-count limits no
  longer apply to non-leverage accounts. A $1,000 account can day trade.
- **Strategy risk:** see the backtest. Short-horizon dip-buying often trails
  buy-and-hold once costs and short-term tax are included. Phase 1 exists to test that.
- **No margin, no shorting, no options** in v1.
