# Trade Journal

Written by the daily routine; read by the next day's run for continuity, and by
humans for auditing. Layout once live:

- `state.json` — open positions, cash, reserve ledger, halt flags, PDT counter
- `trades.csv` — every fill: timestamp, ticker, side, qty, price, rule that fired
- `reports/YYYY-MM-DD.md` — one human-readable report per run

**Nothing lands here until this folder lives in a private repo** — journal data
maps out real positions and P&L and doesn't belong in a public profile repo.
