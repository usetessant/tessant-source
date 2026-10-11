import Link from "next/link";
import DebtFlow from "./DebtFlow";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-grid" aria-hidden />
      <div className="shell hero-inner">
        <div className="hero-copy">
          <p className="status-line"><span /> Built for BNB Chain</p>
          <h1>Model how BNB rewards can offset debt.</h1>
          <p className="hero-intro">
            Tessant compares staked-BNB rewards with the cost of low-LTV lisUSD credit before you continue to Lista.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/app">Plan a position</Link>
            <Link className="button secondary" href="/#mechanism">See the mechanism</Link>
          </div>
          <p className="hero-footnote">
            Positive estimated paydown depends on staking rewards remaining above borrowing interest.
          </p>
        </div>
        <DebtFlow />
      </div>
    </section>
  );
}
