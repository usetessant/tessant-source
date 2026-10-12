import Link from "@/components/SiteLink";
import DebtFlow from "./DebtFlow";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-grid" aria-hidden />
      <div className="shell hero-inner">
        <div className="hero-copy">
          <p className="status-line"><span /> Built for BNB Chain</p>
          <h1>Keep BNB staked. Put credit to work.</h1>
          <p className="hero-intro">
            Stake BNB, borrow lisUSD against slisBNB and manage your position directly on BNB Mainnet.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/app">Open app</Link>
            <Link className="button secondary" href="/#mechanism">See the mechanism</Link>
          </div>
          <p className="hero-footnote">
            Staking rewards accrue in slisBNB. Debt repayment is currently wallet-confirmed, not automatic.
          </p>
        </div>
        <DebtFlow />
      </div>
    </section>
  );
}
