#!/usr/bin/env python3
"""Backtest strategy.yaml against daily Yahoo Finance bars.

Models the daily routine as written: one decision point per market day,
priced at that day's open (the routine runs ~40 min after the open). Exits
are evaluated before entries; entries are limit orders that fill only if
the day's low reaches the limit price.

Not modeled: earnings filter, loss halts, slippage, dividends. Treat results
as a rough read on whether the rules have an edge, not a forecast.

Usage: python3 trading/backtest.py [--years 3] [--strategy trading/strategy.yaml]
"""
import argparse
import datetime as dt
import json
import os
import urllib.request

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))


def fetch_bars(symbol, years, cache_dir):
    path = os.path.join(cache_dir, f"{symbol}_{years}y.json")
    if os.path.exists(path):
        with open(path) as f:
            raw = json.load(f)
    else:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range={years}y&interval=1d"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = json.load(resp)
        with open(path, "w") as f:
            json.dump(raw, f)
    res = raw["chart"]["result"][0]
    offset = res["meta"].get("gmtoffset", 0)
    q = res["indicators"]["quote"][0]
    bars = {}
    for i, ts in enumerate(res["timestamp"]):
        o, h, l, c, v = (q[k][i] for k in ("open", "high", "low", "close", "volume"))
        if None in (o, h, l, c, v):
            continue
        day = dt.datetime.fromtimestamp(ts + offset, dt.timezone.utc).date()
        bars[day] = {"o": o, "h": h, "l": l, "c": c, "v": v}
    return bars


def run(cfg, data, calendar):
    budget = cfg["budget"]["total_usd"]
    max_deployed = budget * cfg["budget"]["max_deployed_pct"] / 100
    reserve_pct = cfg["budget"]["reserve"]["pct_of_realized_gains"] / 100
    uni = cfg["universe"]
    ent, ex = cfg["entries"], cfg["exits"]
    lookback = ent["dip_trigger"]["lookback_days"]
    drop = ent["dip_trigger"]["drop_pct_from_high"] / 100
    vol_ratio_min = ent["confirmation"]["min_volume_ratio"]
    per_trade = ent["sizing"]["per_trade_usd"]
    offset = ent["limit_offset_pct"] / 100
    tp, sl = ex["take_profit_pct"] / 100, ex["stop_loss_pct"] / 100
    max_hold = ex["max_hold_days"]
    max_buys = cfg["risk"]["max_trades_per_day"]

    cash, reserve = float(budget), 0.0
    positions, trades, curve = {}, [], []
    warmup = max(lookback, 30)

    for t in range(warmup, len(calendar)):
        day = calendar[t]
        # exits first, at the open
        for sym in list(positions):
            bar = data[sym].get(day)
            if not bar:
                continue
            p = positions[sym]
            p["held"] += 1
            ret = bar["o"] / p["entry"] - 1
            reason = ("stop" if ret <= -sl else "target" if ret >= tp
                      else "time" if p["held"] >= max_hold else None)
            if reason:
                proceeds = p["shares"] * bar["o"]
                gain = proceeds - p["cost"]
                to_reserve = gain * reserve_pct if gain > 0 else 0.0
                reserve += to_reserve
                cash += proceeds - to_reserve
                trades.append({"sym": sym, "in": p["date"], "out": day, "pnl": gain,
                               "ret": ret, "reason": reason, "days": p["held"]})
                del positions[sym]

        # entries: deepest dips first
        deployed = sum(p["cost"] for p in positions.values())
        candidates = []
        for sym in uni["tickers"]:
            if sym in positions or day not in data[sym]:
                continue
            hist = [data[sym].get(d) for d in calendar[t - 30:t]]
            if any(b is None for b in hist):
                continue
            high = max(b["c"] for b in hist[-lookback:])
            avg_vol = sum(b["v"] for b in hist) / len(hist)
            price = data[sym][day]["o"]
            depth = 1 - price / high
            if (depth >= drop and hist[-1]["v"] / avg_vol >= vol_ratio_min
                    and avg_vol * hist[-1]["c"] >= uni["min_avg_dollar_volume"]):
                candidates.append((depth, sym, price))
        buys = 0
        for depth, sym, price in sorted(candidates, reverse=True):
            if (buys >= max_buys or len(positions) >= uni["max_positions"]
                    or deployed + per_trade > max_deployed or cash < per_trade):
                break
            limit = price * (1 - offset)
            if data[sym][day]["l"] > limit:
                continue  # limit never touched
            shares = per_trade / limit
            positions[sym] = {"entry": limit, "shares": shares, "cost": per_trade,
                              "date": day, "held": 0}
            cash -= per_trade
            deployed += per_trade
            buys += 1

        mtm = sum(p["shares"] * (data[s].get(day) or {"c": p["entry"]})["c"]
                  for s, p in positions.items())
        curve.append((day, cash + reserve + mtm))

    return trades, curve, reserve, positions


def max_drawdown(values):
    peak, mdd = values[0], 0.0
    for v in values:
        peak = max(peak, v)
        mdd = max(mdd, 1 - v / peak)
    return mdd


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--strategy", default=os.path.join(HERE, "strategy.yaml"))
    ap.add_argument("--years", type=int, default=3)
    ap.add_argument("--cache", default=os.environ.get("BACKTEST_CACHE", "/tmp/backtest-cache"))
    ap.add_argument("--trades", action="store_true", help="print every trade")
    args = ap.parse_args()
    os.makedirs(args.cache, exist_ok=True)

    with open(args.strategy) as f:
        cfg = yaml.safe_load(f)
    syms = cfg["universe"]["tickers"]
    data = {s: fetch_bars(s, args.years, args.cache) for s in set(syms) | {"SPY"}}
    calendar = sorted(data["SPY"])

    trades, curve, reserve, open_pos = run(cfg, data, calendar)
    budget = cfg["budget"]["total_usd"]
    start, end = curve[0][0], curve[-1][0]
    final = curve[-1][1]
    spy0, spy1 = data["SPY"][start]["o"], data["SPY"][end]["c"]
    spy_curve = [budget * data["SPY"][d]["c"] / spy0 for d, _ in curve]
    wins = [t for t in trades if t["pnl"] > 0]
    losses = [t for t in trades if t["pnl"] <= 0]

    print(f"Backtest {start} -> {end}  ({len(curve)} market days, budget ${budget:,.0f})")
    print(f"  Strategy final equity : ${final:,.2f}  ({final / budget - 1:+.1%})"
          f"  max drawdown {max_drawdown([v for _, v in curve]):.1%}")
    print(f"  SPY buy-and-hold      : ${budget * spy1 / spy0:,.2f}  ({spy1 / spy0 - 1:+.1%})"
          f"  max drawdown {max_drawdown(spy_curve):.1%}")
    print(f"  Reserve set aside     : ${reserve:,.2f}   open positions at end: {len(open_pos)}")
    if trades:
        print(f"  Closed trades: {len(trades)}  win rate {len(wins) / len(trades):.0%}"
              f"  avg win {sum(t['ret'] for t in wins) / max(len(wins), 1):+.1%}"
              f"  avg loss {sum(t['ret'] for t in losses) / max(len(losses), 1):+.1%}"
              f"  avg hold {sum(t['days'] for t in trades) / len(trades):.1f}d")
        for reason in ("target", "stop", "time"):
            group = [t for t in trades if t["reason"] == reason]
            print(f"    exits by {reason:<6}: {len(group):>3}  P&L ${sum(t['pnl'] for t in group):+,.2f}")
    by_year = {}
    for d, v in curve:
        by_year.setdefault(d.year, []).append(v)
    prev = budget
    print("  By year: " + "  ".join(
        f"{y}: {(vals[-1] / (prev := (prev if i == 0 else by_year[y - 1][-1])) - 1):+.1%}"
        for i, (y, vals) in enumerate(sorted(by_year.items()))))
    if args.trades:
        for t in trades:
            print(f"    {t['in']} -> {t['out']}  {t['sym']:<5} {t['ret']:+6.1%}  {t['reason']}")


if __name__ == "__main__":
    main()
