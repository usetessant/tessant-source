import TestnetCredit from "@/components/TestnetCredit";

export const metadata = { title: "BSC Testnet sandbox", description: "Test the Tessant position lifecycle with tBNB and mock lisUSD." };

export default function TestnetPage() {
  return <><section className="page-hero"><div className="shell"><p className="section-index">BSC Testnet</p><h1>Test the position lifecycle before mainnet.</h1><p>The sandbox mirrors collateral, debt, interest and reward settlement with tBNB and mock lisUSD. It does not connect to Lista&apos;s production market.</p></div></section><section className="content-section"><div className="shell testnet-layout"><TestnetCredit /><aside className="testnet-notes"><div><span>01</span><h2>Deposit</h2><p>Supply tBNB to the isolated sandbox contract.</p></div><div><span>02</span><h2>Borrow</h2><p>Mint mock lisUSD against the fixed testnet reference value.</p></div><div><span>03</span><h2>Settle</h2><p>Apply elapsed mock rewards and interest to see the debt move.</p></div><div><span>04</span><h2>Repay</h2><p>Approve and burn mock lisUSD against the open balance.</p></div></aside></div></section></>;
}
