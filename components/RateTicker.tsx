"use client";

import { useEffect, useState } from "react";
import { FALLBACK_RATES, isMarketRates, type MarketRates } from "@/lib/tessant";

export default function RateTicker() {
  const [paused, setPaused] = useState(false);
  const [rates, setRates] = useState<MarketRates>(FALLBACK_RATES);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/rates", { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error("Rates unavailable");
      return response.json();
    }).then((data) => { if (isMarketRates(data)) setRates(data); }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const breakEven = rates.borrowApr > 0 ? rates.stakingApr / rates.borrowApr : 0;
  const items = [
    `BNB $${rates.bnbPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `base staking APR ${(rates.stakingApr * 100).toFixed(2)}%`,
    `lisUSD borrow APR ${(rates.borrowApr * 100).toFixed(2)}%`,
    `break-even LTV ${(breakEven * 100).toFixed(1)}%`,
    `slisBNB market liquidity $${(rates.liquidity / 1_000_000).toFixed(1)}m`,
  ];

  return <section className={`ticker ${paused ? "is-paused" : ""}`} aria-label="Current reference rates"><div className="ticker-track" tabIndex={0}>{[...items, ...items].map((item, index) => <span key={`${item}-${index}`}><i aria-hidden />{item}</span>)}</div><button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? "Resume" : "Pause"}</button></section>;
}
