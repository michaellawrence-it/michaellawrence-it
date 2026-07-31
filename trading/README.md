# Automated Trading — Configuration & Architecture

> **⚠️ This repository is PUBLIC** (it's the GitHub profile repo). Everything in this
> folder is placeholder-only scaffold. Before filling `strategy.yaml` with real
> parameters or accumulating journal data, migrate this folder to a **private** repo.
> API keys never go in any repo, public or private — they live only in the Claude Code
> environment's secrets.

## What this is

A daily, rules-driven trading routine: monitor a defined universe of tickers, buy
dips per the rules in `strategy.yaml`, exit at defined profit/loss/time thresholds,
and split realized gains between redeployable capital and a cash reserve.

Division of labor, by design:

| Responsibility | Owner |
|---|---|
| Strategy rules, budget, risk limits | **Human** (via `strategy.yaml`) |
| Daily monitoring, dip detection, order sizing, journaling | Claude routine |
| Paper-trade execution | Claude routine (autonomous) |
| **Live-trade execution** | Claude proposes → **human approves each order** |
| Deposits, withdrawals, transfers | **Human only** — never exposed to tooling |

## Components

1. **Brokerage: Alpaca** — API-first, commission-free, fractional shares, and paper
   trading that mirrors live exactly. The budget is enforced structurally: fund a
   dedicated account with exactly the budget, so nothing outside it is reachable.
   *(Swappable: an existing brokerage — Robinhood/Schwab/Fidelity — can be bridged
   via a SnapTrade-style MCP server instead; only `.mcp.json` changes.)*

2. **MCP server: [`alpaca-mcp-server`](https://github.com/alpacahq/alpaca-mcp-server)**
   (official) — configured in [`.mcp.json`](../.mcp.json) at the repo root. Keys are
   read from environment variables, never committed. `ALPACA_TOOLSETS` restricts the
   tool surface to what the routine needs — no options, no shorting/locates, and the
   server has no transfer/withdrawal tools at all.

3. **Rulebook: `strategy.yaml`** — copy `strategy.template.yaml`, fill it in. The
   routine treats it as exhaustive: anything the rulebook doesn't permit doesn't happen.

4. **Daily Routine** — a scheduled Claude session on market days (see
   `routine-prompt.md` for the exact instructions it runs). Each run: pull account
   state + market data → evaluate entries/exits against the rulebook → write the
   journal → execute (paper) or propose-and-await-approval (live).

5. **Journal: `journal/`** — `trades.csv`, `state.json` (open positions, reserve
   balance, halt flags), and a dated markdown report per run. Committed every run so
   each fresh session has full continuity and every decision is auditable.

## Phases

- **Phase 0 — Configuration (now).** Wire up MCP, secrets, and the rulebook template.
- **Phase 1 — Paper (2–4+ weeks).** `ALPACA_PAPER_TRADE=true` with paper keys. The
  routine runs fully autonomously. Tune `strategy.yaml` against real journal data —
  this phase is what tells you whether the dip rules actually make money.
- **Phase 2 — Live, approval-gated.** Live keys, small budget first. The routine
  prepares orders; each one is submitted only after a human approval tap. Order tools
  stay OFF any permission allowlist so they always prompt in live mode.

## Setup checklist (human steps)

1. Create an Alpaca account → generate **paper** API keys (live keys come in Phase 2).
2. In the Claude Code environment settings, add secrets: `ALPACA_API_KEY`,
   `ALPACA_SECRET_KEY`. Leave `ALPACA_PAPER_TRADE` unset (defaults to paper).
3. Ensure the environment's network policy allows `paper-api.alpaca.markets`,
   `api.alpaca.markets`, and `data.alpaca.markets`.
4. Copy `strategy.template.yaml` → `strategy.yaml` and fill in the guidelines.
5. Say the word, and the daily Routine gets created (market days, mid-morning ET;
   cron is stored in UTC, so it needs a manual nudge when DST flips).

## Risk notes (read once, decide deliberately)

- **PDT rule:** a margin account making 4+ day trades within 5 business days must
  hold $25k+ equity. Week-trading cadence (multi-day holds) mostly sidesteps this;
  the template's `respect_pdt_rule` and `max_hold_days` exist for that reason. A cash
  account avoids PDT entirely but adds T+1 settlement drag.
- **Strategy risk:** short-horizon dip-buying underperforms buy-and-hold for most
  people after slippage and short-term capital-gains tax. That's not a reason not to
  try it — it's the reason Phase 1 exists. Let the paper journal make the case.
- **No margin, no shorting, no options** in v1. Keep the failure modes boring.
