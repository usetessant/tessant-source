"use client";

import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract, formatEther, formatUnits, parseEther, parseUnits } from "ethers";

const ADDRESS = process.env.NEXT_PUBLIC_TESSANT_SANDBOX_ADDRESS ?? "";
const SANDBOX_ABI = [
  "function deposit() payable",
  "function borrow(uint256 amount)",
  "function repay(uint256 amount)",
  "function settle()",
  "function mockLisUSD() view returns (address)",
  "function positionOf(address account) view returns (uint256 collateral,uint256 debt,uint256 pendingRewards,uint256 pendingInterest,uint256 healthFactorE18)",
];
const TOKEN_ABI = ["function approve(address spender,uint256 amount) returns (bool)"];

type Position = { collateral: string; debt: string; rewards: string; interest: string; health: string };

function messageFrom(error: unknown) {
  if (typeof error === "object" && error) {
    const value = error as { shortMessage?: string; message?: string; code?: number };
    if (value.code === 4001) return "The wallet request was declined.";
    return value.shortMessage ?? value.message ?? "The transaction could not be completed.";
  }
  return "The transaction could not be completed.";
}

export default function TestnetCredit() {
  const [provider, setProvider] = useState<BrowserProvider>();
  const [account, setAccount] = useState("");
  const [position, setPosition] = useState<Position>();
  const [amount, setAmount] = useState("0.02");
  const [debtAmount, setDebtAmount] = useState("2");
  const [status, setStatus] = useState(ADDRESS ? "Connect a wallet to read the sandbox." : "Public deployment is waiting for testnet gas.");
  const [busy, setBusy] = useState(false);

  const readPosition = useCallback(async (nextProvider: BrowserProvider, nextAccount: string) => {
    if (!ADDRESS) return;
    const contract = new Contract(ADDRESS, SANDBOX_ABI, nextProvider);
    const result = await contract.positionOf(nextAccount);
    setPosition({ collateral: formatEther(result.collateral), debt: formatUnits(result.debt, 18), rewards: formatUnits(result.pendingRewards, 18), interest: formatUnits(result.pendingInterest, 18), health: (Number(result.healthFactorE18) / 1e18).toFixed(2) });
  }, []);

  useEffect(() => { if (provider && account) readPosition(provider, account).catch(() => undefined); }, [provider, account, readPosition]);

  async function connect() {
    const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!ethereum) { setStatus("Install an EVM wallet to use the sandbox."); return; }
    try {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x61" }] });
    } catch {
      await ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x61", chainName: "BSC Testnet", nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 }, rpcUrls: ["https://bsc-testnet-dataseed.bnbchain.org"], blockExplorerUrls: ["https://testnet.bscscan.com"] }] });
    }
    const nextProvider = new BrowserProvider(ethereum);
    const accounts = await nextProvider.send("eth_requestAccounts", []);
    setProvider(nextProvider); setAccount(accounts[0]); setStatus("BSC Testnet connected.");
  }

  async function transact(kind: "deposit" | "borrow" | "repay" | "settle") {
    if (!provider || !account || !ADDRESS) return;
    setBusy(true);
    try {
      const signer = await provider.getSigner();
      const contract = new Contract(ADDRESS, SANDBOX_ABI, signer);
      if (kind === "deposit") await (await contract.deposit({ value: parseEther(amount) })).wait();
      if (kind === "borrow") await (await contract.borrow(parseUnits(debtAmount, 18))).wait();
      if (kind === "repay") {
        const value = parseUnits(debtAmount, 18);
        const lisUsdAsset = new Contract(await contract.mockLisUSD(), TOKEN_ABI, signer);
        setStatus("Approve mock lisUSD, then confirm repayment.");
        await (await lisUsdAsset.approve(ADDRESS, value)).wait();
        await (await contract.repay(value)).wait();
      }
      if (kind === "settle") await (await contract.settle()).wait();
      await readPosition(provider, account);
      setStatus("Transaction confirmed on BSC Testnet.");
    } catch (error) { setStatus(messageFrom(error)); }
    finally { setBusy(false); }
  }

  if (!ADDRESS) return <div className="testnet-pending"><span>Contract package ready</span><h2>BSC Testnet deployment is not configured.</h2><p>Set a verified sandbox address before enabling wallet transactions. No placeholder contract is shown.</p><div><strong>Network</strong><b>BSC Testnet · chain 97</b></div></div>;

  return <div className="testnet-console"><div className="console-head"><div><span>BSC Testnet sandbox</span><strong>{account ? `${account.slice(0, 7)}…${account.slice(-5)}` : "Not connected"}</strong></div><button type="button" onClick={connect}>{account ? "Connected" : "Connect wallet"}</button></div><div className="console-position"><div><span>Collateral</span><strong>{position?.collateral ?? "0.0"} tBNB</strong></div><div><span>Debt</span><strong>{position?.debt ?? "0.0"} tlisUSD</strong></div><div><span>Pending base rewards</span><strong>{position?.rewards ?? "0.0"}</strong></div><div><span>Pending interest</span><strong>{position?.interest ?? "0.0"}</strong></div><div><span>Health factor</span><strong>{position?.health ?? "—"}</strong></div></div><div className="console-actions"><label><span>Collateral amount</span><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" /><button disabled={!account || busy} onClick={() => transact("deposit")}>Deposit tBNB</button></label><label><span>Debt amount</span><input value={debtAmount} onChange={(event) => setDebtAmount(event.target.value)} inputMode="decimal" /><div><button disabled={!account || busy} onClick={() => transact("borrow")}>Borrow mock lisUSD</button><button disabled={!account || busy} onClick={() => transact("repay")}>Repay</button></div></label><button className="settle-button" disabled={!account || busy} onClick={() => transact("settle")}>Apply elapsed rewards and interest</button></div><p className="console-status" aria-live="polite">{status}</p></div>;
}
