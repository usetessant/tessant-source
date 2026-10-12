import Link from "@/components/SiteLink";
import Logo from "./Logo";
import { OFFICIAL_LINKS } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-shell">
        <div className="footer-lead">
          <Logo />
          <p>Low-LTV lisUSD credit backed by staked BNB.</p>
        </div>
        <div className="footer-links">
          <div>
            <span>Product</span>
            <Link href="/app">Mainnet app</Link>
            <Link href="/#mechanism">Mechanism</Link>
            <Link href="/app/planner">Economics calculator</Link>
          </div>
          <div>
            <span>Read</span>
            <Link href="/docs">Documentation</Link>
            <Link href="/docs#economics">Economics</Link>
            <Link href="/protocol">Architecture</Link>
          </div>
          <div>
            <span>Elsewhere</span>
            <a href={OFFICIAL_LINKS.x}>X / @use_tessant</a>
            <a href="https://lista.org" target="_blank" rel="noreferrer">Lista DAO</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Tessant</span>
        <span>usetessant.xyz · BNB Chain</span>
      </div>
    </footer>
  );
}
