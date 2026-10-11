export const metadata = { title: "Architecture" };

const LAYERS = [
  ["Collateral", "BNB becomes yield-bearing slisBNB while remaining the economic base of the position."],
  ["Credit", "Lista supplies the lisUSD debt and enforces collateral and liquidation parameters."],
  ["Accounting", "Tessant compares base rewards with borrowing interest and exposes the estimated net change."],
  ["Repayment path", "A future automation layer can convert harvested value to lisUSD and apply it to debt."],
];

export default function ProtocolPage() {
  return (
    <>
      <section className="page-hero">
        <div className="shell">
          <p className="section-index">Architecture</p>
          <h1>A planning layer over established BNB primitives.</h1>
          <p>Tessant keeps the collateral, credit venue and economic model legible instead of presenting an opaque yield claim.</p>
        </div>
      </section>
      <section className="content-section">
        <div className="shell protocol-grid">
          {LAYERS.map(([title, text], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="content-section protocol-dark">
        <div className="shell content-grid">
          <div>
            <p className="section-index">Separation</p>
            <h2>Mainnet planning and the testnet sandbox stay distinct.</h2>
          </div>
          <div>
            <p>Mainnet planning uses public reference data and continues into Lista. BSC Testnet uses mock lisUSD and a fixed oracle value, so test results are never presented as production liquidity or yield.</p>
          </div>
        </div>
      </section>
    </>
  );
}
