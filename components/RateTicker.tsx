"use client";

import { useEffect, useState } from "react";
import { FALLBACK_RATES, loadReferenceRates, type MarketRates } from "@/lib/tessant";

export default function RateTicker() {
  const [paused, setPaused] = useState(false);
  const [rates, setRates] = useState<MarketRates>(FALLBACK_RATES);

  useEffect(() => {
    const controller = new AbortController();
    loadReferenceRates(controller.signal).then(data=>{if(!controller.signal.aborted)setRates(data);}).catch(()=>undefined);
    return () => controller.abort();
  }, []);

  const breakEven = rates.borrowApr > 0 ? rates.stakingApr / rates.borrowApr : 0;
  const items = [
    rates.live ? "Live market reference" : "Illustrative reference snapshot",
    `BNB $${rates.bnbPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `base staking APR ${(rates.stakingApr * 100).toFixed(2)}%${rates.stakingLive===false?" reference":""}`,
    `lisUSD borrow APR ${(rates.borrowApr * 100).toFixed(2)}%`,
    `break-even LTV ${(breakEven * 100).toFixed(1)}%`,
    `slisBNB market liquidity $${(rates.liquidity / 1_000_000).toFixed(1)}m`,
  ];

  return <section className={`ticker ${paused ? "is-paused" : ""}`} aria-label="Current reference rates"><div className="ticker-track" tabIndex={0}>{[...items, ...items].map((item, index) => <span key={`${item}-${index}`}><i aria-hidden />{item}</span>)}</div><button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? "Resume" : "Pause"}</button></section>;
}
