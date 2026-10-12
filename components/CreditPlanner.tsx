"use client";

import { useEffect, useMemo, useState } from "react";
import { calculatePosition, FALLBACK_RATES, loadReferenceRates, TESSANT, type MarketRates } from "@/lib/tessant";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

export default function CreditPlanner() {
  const [bnb, setBnb] = useState(2.5);
  const [ltvPct, setLtvPct] = useState(12);
  const [rates, setRates] = useState<MarketRates>(FALLBACK_RATES);
  const [wallet, setWallet] = useState("");
  const [walletState, setWalletState] = useState("Connect wallet");
  const [connecting, setConnecting] = useState(false);
  const [walletHelp, setWalletHelp] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadReferenceRates(controller.signal).then(data=>{if(!controller.signal.aborted)setRates(data);}).catch(()=>undefined);
    return () => controller.abort();
  }, []);

  const result = useMemo(() => calculatePosition(bnb, ltvPct / 100, rates), [bnb, ltvPct, rates]);
  const paydown = result.netPaydown > 0;

  async function connect() {
    const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (connecting) return;
    if (!ethereum) { setWalletHelp(true); setWalletState("Connect wallet"); return; }
    setConnecting(true);
    setWalletHelp(false);
    setWalletState("Check your wallet…");
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" }) as string[];
      try {
        await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] });
      } catch (error) {
        const code = (error as { code?: number }).code;
        if (code !== 4902) throw error;
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x38",
            chainName: TESSANT.chainName,
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            rpcUrls: ["https://bsc-dataseed.bnbchain.org"],
            blockExplorerUrls: ["https://bscscan.com"],
          }],
        });
      }
      const chain = await ethereum.request({ method: "eth_chainId" });
      if (Number(chain) !== TESSANT.chainId) throw new Error("Switch to BNB Chain to connect.");
      setWallet(accounts[0] ?? "");
      setWalletState("BNB Chain connected");
    } catch (error) {
      setWallet("");
      const code = (error as { code?: number }).code;
      setWalletState(code === -32002 ? "Open the pending wallet request" : code === 4001 ? "Connection declined — retry" : "Connection failed — retry");
    } finally { setConnecting(false); }
  }

  return <div className="planner"><div className="planner-inputs"><div className="planner-title"><div><span>Position planner</span><h2>Choose the debt, then see what yield can actually cover.</h2></div><button type="button" className="wallet-button" disabled={connecting} onClick={connect}>{wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : walletState}</button></div>{walletHelp && <div className="wallet-help" role="status"><p>Open Tessant in your wallet’s browser, or use a browser with an EVM wallet extension.</p><a href="https://metamask.app.link/dapp/usetessant.xyz/app">Open in MetaMask</a><a href="https://link.trustwallet.com/open_url?coin_id=20000714&url=https%3A%2F%2Fusetessant.xyz%2Fapp">Open in Trust Wallet</a><button type="button" onClick={() => setWalletHelp(false)}>Close</button></div>}<label className="amount-input"><span>BNB collateral</span><div><input type="number" min="0.1" step="0.1" value={Number.isFinite(bnb) ? bnb : ""} onChange={(event) => setBnb(event.target.value === "" ? Number.NaN : Math.max(0, Number(event.target.value)))} /><strong>BNB</strong></div><small>{money(result.collateralValue)} at the current reference price</small></label><label className="range-input"><span><b>Starting LTV</b><strong>{ltvPct.toFixed(1)}%</strong></span><input type="range" min="5" max="45" step="0.5" value={ltvPct} onChange={(event) => setLtvPct(Number(event.target.value))} /><div className="range-legend"><span>5%</span><span>Low-LTV working zone</span><span>45%</span></div></label><div className="ltv-track"><i style={{ width: `${Math.min(100, (result.breakEvenLtv / rates.liquidationLtv) * 100)}%` }} /><b style={{ left: `${Math.min(100, (ltvPct / 100 / rates.liquidationLtv) * 100)}%` }} /><span>break-even {(result.breakEvenLtv * 100).toFixed(1)}%</span><span>liquidation limit {(rates.liquidationLtv * 100).toFixed(0)}%</span></div></div><div className="planner-output"><div className="borrow-line"><span>Borrow amount</span><strong>{money(result.debt)} <small>lisUSD</small></strong></div><dl><div><dt>Base rewards / year</dt><dd>{money(result.rewards)}</dd></div><div><dt>Borrow interest / year</dt><dd>−{money(result.interest)}</dd></div><div className={paydown ? "positive" : "negative"}><dt>Estimated net debt change</dt><dd>{paydown ? "−" : "+"}{money(Math.abs(result.netPaydown))}</dd></div><div><dt>Health factor</dt><dd>{Number.isFinite(result.healthFactor) ? result.healthFactor.toFixed(2) : "—"}</dd></div><div><dt>Illustrative liquidation price</dt><dd>{money(result.liquidationPrice)}</dd></div></dl><p className="planner-verdict"><span data-positive={paydown} />{paydown ? "At current base rates, rewards exceed estimated interest." : "At current rates, interest exceeds staking rewards. Reduce the starting LTV."}</p><div className="planner-actions"><a className="button primary" href={TESSANT.listaUrl} target="_blank" rel="noreferrer">Continue with Lista</a><a className="button secondary" href="/docs#economics">Review the calculation</a></div><small className="data-note">{rates.live ? "Live market reference data" : "Fallback market snapshot"}. {rates.stakingLive === false ? `Base staking APR is a reference dated ${rates.stakingObservedAt ?? "2026-10-11"}. ` : "Base staking APR comes from Lista. "}Temporary launchpool incentives are excluded. Rates and BNB price can change.</small></div></div>;
}
