import MainnetCredit from "@/components/MainnetCredit";
export const metadata = { title: "BNB Mainnet credit", description: "Open and manage a slisBNB-backed lisUSD position on BNB Chain." };
export default function AppPage() { return <><section className="app-hero mainnet-hero"><div className="shell"><h1>Staked BNB. Usable credit.</h1><p>Open and manage a real slisBNB-backed lisUSD position on BNB Mainnet. Your wallet signs each operation directly with Lista.</p></div></section><section className="planner-section"><div className="shell"><MainnetCredit /></div></section></>; }
