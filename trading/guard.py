#!/usr/bin/env python3
"""PreToolUse hook: deterministic enforcement of strategy.yaml for Alpaca tools.

Runs before every mcp__alpaca* tool call (see .claude/settings.json).
  exit 0             -> call proceeds to the normal permission flow
  exit 2             -> call is blocked; stderr is shown to Claude
  "ask" JSON on stdout -> forces a human approval prompt (all live orders)

Fails closed: an unreadable rulebook, unknown server, or unknown tool blocks.
"""
import datetime as dt
import json
import os
import sys
from zoneinfo import ZoneInfo

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
STRATEGY = os.path.join(HERE, "strategy.yaml")
STATE = os.path.join(HERE, "journal", "state.json")
HALT = os.path.join(HERE, "HALT")
GUARD_LOG = os.path.join(HERE, "journal", "guard-log.jsonl")

READ_ONLY_PREFIXES = ("get_", "search_", "list_", "fetch_")
RISK_REDUCING = {"cancel_order_by_id", "cancel_all_orders"}
SERVER_FOR_MODE = {"paper": "alpaca-paper", "live": "alpaca-live"}


def block(reason):
    print(f"guard.py blocked this call: {reason}. Do not retry with altered "
          f"parameters to get around the guard; log it as skipped.", file=sys.stderr)
    sys.exit(2)


def approve(cfg, log_entry=None):
    if log_entry:
        with open(GUARD_LOG, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    if cfg["mode"] == "live":
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "ask",
            "permissionDecisionReason": "Live order: human approval required",
        }}))
    sys.exit(0)


def buys_today(today):
    if not os.path.exists(GUARD_LOG):
        return 0
    with open(GUARD_LOG) as f:
        entries = [json.loads(line) for line in f if line.strip()]
    return sum(1 for e in entries if e["date"] == today and e["side"] == "buy")


def check_stock_order(cfg, order, today):
    side = str(order.get("side", "")).lower()
    symbol = str(order.get("symbol", "")).upper()
    if order.get("extended_hours"):
        block("extended-hours orders are not permitted")
    if order.get("advanced_instructions"):
        block("advanced routing instructions are not permitted")
    if (order.get("order_class") or "simple") not in ("simple", "bracket"):
        block(f"order_class {order['order_class']!r} is not permitted")
    if side == "sell":
        return {"date": today, "side": side, "symbol": symbol}  # exits are never capped
    if side != "buy":
        block(f"unknown side {side!r}")

    ent = cfg["entries"]
    if symbol not in {t.upper() for t in cfg["universe"]["tickers"]}:
        block(f"{symbol} is not in universe.tickers")
    if order.get("type", "market") != ent["order_type"]:
        block(f"buy orders must be type {ent['order_type']!r}")
    if order.get("notional"):
        cost = float(order["notional"])
    elif order.get("qty") and order.get("limit_price"):
        cost = float(order["qty"]) * float(order["limit_price"])
    else:
        block("buy order needs qty + limit_price (or notional) so its cost can be checked")
    cap = min(ent["sizing"]["per_trade_usd"], ent["sizing"]["max_per_symbol_usd"])
    if cost > cap * 1.01:
        block(f"order cost ${cost:,.2f} exceeds the ${cap:,.2f} per-trade cap")
    if buys_today(today) >= cfg["risk"]["max_trades_per_day"]:
        block(f"max_trades_per_day ({cfg['risk']['max_trades_per_day']}) reached")
    return {"date": today, "side": side, "symbol": symbol, "cost": round(cost, 2)}


def main():
    event = json.load(sys.stdin)
    parts = event.get("tool_name", "").split("__")
    if len(parts) != 3:
        block(f"unrecognized tool name {event.get('tool_name')!r}")
    _, server, tool = parts
    if tool.startswith(READ_ONLY_PREFIXES) or tool in RISK_REDUCING:
        sys.exit(0)

    try:
        with open(STRATEGY) as f:
            cfg = yaml.safe_load(f)
        expected = SERVER_FOR_MODE[cfg["mode"]]
    except Exception as e:
        block(f"cannot load strategy.yaml ({e}); failing closed")
    if server != expected:
        block(f"server {server!r} does not match mode {cfg['mode']!r} (expected {expected!r})")
    if os.path.exists(HALT):
        block("trading/HALT exists; a human must remove it to resume")
    if os.path.exists(STATE):
        with open(STATE) as f:
            if json.load(f).get("halt"):
                block("state.json has halt set; a human must clear it")

    today = dt.datetime.now(ZoneInfo("America/New_York")).date().isoformat()
    order = event.get("tool_input", {})
    if tool == "close_position":
        approve(cfg, {"date": today, "side": "sell", "symbol": order.get("symbol")})
    if tool == "place_stock_order":
        approve(cfg, check_stock_order(cfg, order, today))
    block(f"{tool} is not permitted by the rulebook")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:  # a crash exits 1, which Claude Code treats as non-blocking
        block(f"guard error ({type(e).__name__}: {e}); failing closed")
