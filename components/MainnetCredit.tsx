"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserProvider, formatUnits, getAddress, parseEther, type Eip1193Provider } from "ethers";
import { MAINNET, WAD, borrowMore, loanValue, maxBorrow, maxWithdraw, openPosition, readPosition, repayDebt, revokeProvider, supplyCollateral, validateBorrow, validateRepay, verifyMainnet, withdrawCollateral, type MainnetPosition } from "@/lib/mainnet";

type Wallet = Eip1193Provider & {on?:(name:string,listener:()=>void)=>void;removeListener?:(name:string,listener:()=>void)=>void};
type Action = "open" | "add" | "borrow" | "repay" | "withdraw" | "revoke";
type Review = {action:Action;amount:bigint;debt:bigint;asset:"BNB"|"slisBNB";all:boolean;account:string};
const names: Record<Action,string>={open:"Open position",add:"Add collateral",borrow:"Borrow",repay:"Repay",withdraw:"Withdraw",revoke:"Revoke provider"};
const amountText=(n:bigint,precision=6)=>Number(formatUnits(n,18)).toLocaleString("en-US",{maximumFractionDigits:precision});
const storageKey=(account:string)=>`tessant:pending:v1:56:${account.toLowerCase()}`;
const parseAmount=(text:string)=>{if(!/^\d+(\.\d{1,18})?$/.test(text.trim()))throw new Error("Enter a positive amount with up to 18 decimal places.");const n=parseEther(text.trim());if(n<=0n)throw new Error("Enter a positive amount.");return n;};
function errorText(error:unknown){const e=error as {code?:number|string;shortMessage?:string;message?:string;info?:{error?:{message?:string}}};if(/429|rate.?limit|Too Many Requests/i.test(e.info?.error?.message||e.message||""))return "The wallet RPC is rate limited. Wait, refresh and check the latest transaction before retrying.";return e.code===4001||e.code==="ACTION_REJECTED"?"Request declined. Confirmed earlier steps remain in your wallet or position.":e.code===-32002?"A wallet request is already pending. Open your wallet.":e.shortMessage||e.message||"Unable to complete this action. Refresh and check the transaction.";}

export default function MainnetCredit(){
  const [account,setAccount]=useState("");const [provider,setProvider]=useState<BrowserProvider|null>(null);
  const [position,setPosition]=useState<MainnetPosition|null>(null);const [nativeBalance,setNativeBalance]=useState<bigint|null>(null);
  const [action,setAction]=useState<Action>("open");const [asset,setAsset]=useState<"BNB"|"slisBNB">("BNB");
  const [amount,setAmount]=useState("");const [debt,setDebt]=useState("");const [all,setAll]=useState(false);
  const [busy,setBusy]=useState(false);const lock=useRef(false);const generation=useRef(0);
  const [status,setStatus]=useState("Connect your wallet to read your BNB Mainnet position.");const [error,setError]=useState("");
  const [help,setHelp]=useState(false);const [review,setReview]=useState<Review|null>(null);const [hash,setHash]=useState("");const [pending,setPending]=useState(false);
  const walletRef=useRef<Wallet|null>(null);

  useEffect(()=>{
    const wallet=(window as unknown as {ethereum?:Wallet}).ethereum;walletRef.current=wallet||null;
    const changed=()=>{generation.current++;setAccount("");setProvider(null);setPosition(null);setNativeBalance(null);setReview(null);setStatus("Wallet account or network changed. Reconnect to refresh.");};
    wallet?.on?.("accountsChanged",changed);wallet?.on?.("chainChanged",changed);
    return()=>{wallet?.removeListener?.("accountsChanged",changed);wallet?.removeListener?.("chainChanged",changed);generation.current++;};
  },[]);

  async function load(p:BrowserProvider,a:string){
    const epoch=generation.current;
    const [s,b]=await Promise.all([readPosition(p,a),p.getBalance(a)]);
    if(epoch===generation.current){setPosition(s);setNativeBalance(b);}return s;
  }
  async function reconcile(p:BrowserProvider,a:string){
    const saved=localStorage.getItem(storageKey(a));
    if(!saved)return true;
    if(!/^0x[0-9a-fA-F]{64}$/.test(saved))throw new Error("Invalid saved transaction reference. Contact support before sending another transaction.");
    setHash(saved);const receipt=await p.getTransactionReceipt(saved);
    if(!receipt){setPending(true);setStatus("An earlier transaction is pending. Check its receipt before sending another action.");return false;}
    localStorage.removeItem(storageKey(a));setPending(false);
    setStatus(receipt.status===1?"Previous transaction confirmed. Your position has been refreshed.":"Previous transaction reverted. Refresh and review before retrying.");return true;
  }
  async function connect(){
    if(lock.current)return;const wallet=walletRef.current;
    if(!wallet){setHelp(true);return;}lock.current=true;setBusy(true);setError("");setStatus("Open your wallet to connect.");
    try{
      await wallet.request({method:"eth_requestAccounts"});
      try{await wallet.request({method:"wallet_switchEthereumChain",params:[{chainId:"0x38"}]});}
      catch(e){if((e as {code?:number}).code!==4902)throw e;await wallet.request({method:"wallet_addEthereumChain",params:[{chainId:"0x38",chainName:"BNB Chain",nativeCurrency:{name:"BNB",symbol:"BNB",decimals:18},rpcUrls:[MAINNET.rpc],blockExplorerUrls:["https://bscscan.com"]}]});}
      const p=new BrowserProvider(wallet);await verifyMainnet(p);const signer=await p.getSigner();const a=getAddress(await signer.getAddress());
      generation.current++;setProvider(p);setAccount(a);setHelp(false);setPending(false);setHash("");setStatus("Reading the live Lista market and your position.");await load(p,a);
      if(await reconcile(p,a))setStatus("BNB Mainnet connected. Position data comes directly from the contracts.");
    }catch(e){setError(errorText(e));setAccount("");setProvider(null);setPosition(null);}
    finally{lock.current=false;setBusy(false);}
  }
  async function refresh(){if(!provider||!account||lock.current)return;lock.current=true;setBusy(true);setError("");try{await verifyMainnet(provider);await load(provider,account);await reconcile(provider,account);}catch(e){setPosition(null);setError(errorText(e));}finally{lock.current=false;setBusy(false);}}
  async function prepare(){
    if(!provider||!account||lock.current)return;const epoch=generation.current;lock.current=true;setBusy(true);setError("");
    try{
      await verifyMainnet(provider);if(!await reconcile(provider,account))return;
      const s=await load(provider,account);const a=action==="revoke"||action==="repay"&&all?0n:parseAmount(amount);const d=action==="open"?parseAmount(debt):0n;
      if(action==="open"){
        if(asset==="slisBNB"&&a>s.slisBalance)throw new Error("Insufficient slisBNB balance.");
        if(asset==="BNB"&&(s.stakePaused||await provider.getBalance(account)<a+10n**15n))throw new Error("Staking is paused or insufficient BNB. Keep at least 0.001 BNB for gas.");
        validateBorrow(s,d,(asset==="BNB"?a*s.oneBnbInSlis/WAD:a)*999n/1000n);
      }
      if(action==="add"&&(a>s.slisBalance||s.paused||!s.allowed))throw new Error("Enter available slisBNB in an active market.");
      if(action==="borrow")validateBorrow(s,a);
      if(action==="repay")validateRepay(s,all?(s.debt*1001n+999n)/1000n+10n**14n:a,all);
      if(action==="withdraw"&&a>maxWithdraw(s))throw new Error("Withdrawal exceeds the available collateral at Tessant’s 15% LTV limit.");
      if(epoch!==generation.current)throw new Error("Wallet changed. Reconnect before reviewing.");setReview({action,amount:a,debt:d,asset,all,account});setStatus("Review the action before requesting wallet signatures.");
    }catch(e){setError(errorText(e));}finally{lock.current=false;setBusy(false);}
  }
  async function execute(){
    if(!review||!provider||!account||lock.current)return;const r=review;const epoch=generation.current;lock.current=true;setBusy(true);setReview(null);setError("");
    try{
      if(r.account!==account)throw new Error("Wallet account changed. Review again.");
      if(!await reconcile(provider,account))return;
      const probeKey=`${storageKey(account)}:probe`;
      try{localStorage.setItem(probeKey,"1");localStorage.removeItem(probeKey);}catch{throw new Error("Enable local storage before sending. It is used to prevent duplicate pending transactions.");}
      const signer=await provider.getSigner(account);
      const progress=(message:string,txHash?:string,confirmed?:boolean)=>{
        if(txHash){if(!confirmed)localStorage.setItem(storageKey(account),txHash);else localStorage.removeItem(storageKey(account));}
        if(epoch!==generation.current)throw new Error("Wallet changed. Reconnect and check the last confirmed step.");
        setStatus(message);if(txHash){setHash(txHash);setPending(!confirmed);}
      };
      if(r.action==="open")await openPosition(signer,r.asset,r.amount,r.debt,progress);
      if(r.action==="add")await supplyCollateral(signer,r.amount,progress);
      if(r.action==="borrow")await borrowMore(signer,r.amount,progress);
      if(r.action==="repay")await repayDebt(signer,r.amount,r.all,progress);
      if(r.action==="withdraw")await withdrawCollateral(signer,r.amount,progress);
      if(r.action==="revoke")await revokeProvider(signer,progress);
      await load(provider,account);setStatus("Action confirmed on BNB Mainnet. Your position is updated.");setAmount("");setDebt("");
    }catch(e){setError(errorText(e));try{await load(provider,account);}catch{setPosition(null);}}
    finally{lock.current=false;setBusy(false);}
  }
  const ltv=position&&position.collateral>0n?Number(position.debt*10000n/loanValue(position.collateral,position))/100:0;
  return <div className="mainnet-app">
    <div className="mainnet-toolbar"><div><h2>Your position</h2><p>{account?`${account.slice(0,8)}…${account.slice(-6)}`:"Wallet not connected"}</p></div><div><button type="button" className="button secondary" disabled={busy||!account} onClick={refresh}>Refresh</button><button type="button" className="button primary" disabled={busy} onClick={connect}>{busy?"Working…":account?"Reconnect wallet":"Connect wallet"}</button></div></div>
    {help?<div className="wallet-help"><p>Use an EVM wallet extension or open Tessant in your wallet browser.</p><a href="https://metamask.app.link/dapp/usetessant.xyz/app">Open in MetaMask</a><a href="https://link.trustwallet.com/open_url?coin_id=20000714&url=https%3A%2F%2Fusetessant.xyz%2Fapp">Open in Trust Wallet</a></div>:null}
    <div className="mainnet-layout"><section className="mainnet-form" aria-label="Position actions">
      <div className="mainnet-actions" role="group" aria-label="Choose an action">{(Object.keys(names) as Action[]).map(a=><button type="button" key={a} aria-pressed={action===a} disabled={busy} onClick={()=>{setAction(a);setReview(null);setError("");setAmount("");setAll(false);}}>{names[a]}</button>)}</div>
      <h3>{names[action]}</h3>
      {action==="open"?<label>Collateral asset<select disabled={busy} value={asset} onChange={e=>{setAsset(e.target.value as typeof asset);setReview(null);}}><option>BNB</option><option>slisBNB</option></select></label>:null}
      {action==="repay"?<label className="mainnet-check"><input type="checkbox" checked={all} disabled={busy} onChange={e=>{setAll(e.target.checked);setReview(null);}}/>Repay all outstanding debt</label>:null}
      {action!=="revoke"&&!(action==="repay"&&all)?<label>{action==="open"?`Collateral amount (${asset})`:action==="borrow"||action==="repay"?"Amount (lisUSD)":"Amount (slisBNB)"}<input inputMode="decimal" autoComplete="off" value={amount} disabled={busy} onChange={e=>{setAmount(e.target.value);setReview(null);}} placeholder="0.00"/></label>:null}
      {position&&(action==="withdraw"||action==="add")?<button type="button" className="mainnet-max" disabled={busy} onClick={()=>{setAmount(formatUnits(action==="withdraw"?maxWithdraw(position):position.slisBalance,18));setReview(null);}}>{action==="withdraw"?"Use available collateral":"Use wallet slisBNB"}</button>:null}
      {action==="open"?<label>Borrow amount (lisUSD)<input inputMode="decimal" autoComplete="off" value={debt} disabled={busy} onChange={e=>{setDebt(e.target.value);setReview(null);}} placeholder="0.00"/></label>:null}
      <p className="mainnet-terms">{action==="open"?"BNB is staked into slisBNB, supplied as collateral, then lisUSD is sent to your wallet. Each step requires your signature. Opening LTV is limited to 15%.":action==="repay"?"Repayment uses lisUSD in your wallet. Repay all closes the exact debt shares; approval includes a small interest buffer, but only the debt owed is spent.":action==="withdraw"?"Withdrawals return slisBNB, not native BNB. Lista’s collateral provider needs a revocable position-management permission.":action==="revoke"?"Revoke Lista’s collateral provider permission. Your collateral and debt remain unchanged.":action==="add"?"Supply wallet slisBNB to the verified Lista market. Token approval is limited to this deposit amount.":"Borrow lisUSD into your wallet against existing collateral, within Tessant’s 15% LTV limit."}</p>
      {review?<div className="mainnet-review"><h4>Confirm your action</h4><p>{names[review.action]}{review.amount>0n?`: ${amountText(review.amount,18)} ${review.action==="open"?review.asset:review.action==="borrow"||review.action==="repay"?"lisUSD":"slisBNB"}`:""}{review.action==="open"?`, borrow ${amountText(review.debt,18)} lisUSD`:""}{review.all?": all debt shares":""}.</p><p>BNB Mainnet. Variable borrowing rate{position?` currently ${(position.borrowApr*100).toFixed(2)}% APR`:""}. Staking value accrues in slisBNB; this release does not automatically sell it or repay debt.</p><div><button type="button" className="button primary" disabled={busy||pending} onClick={execute}>Confirm in wallet</button><button type="button" className="button secondary" onClick={()=>setReview(null)}>Cancel</button></div></div>:<button type="button" className="button primary mainnet-submit" disabled={!account||!position||busy||pending} onClick={prepare}>Review {names[action].toLowerCase()}</button>}
      {error?<p className="mainnet-error" role="alert">{error}</p>:null}<p className="mainnet-status" role="status">{status}</p>{hash?<a className="mainnet-tx" href={`https://bscscan.com/tx/${hash}`} target="_blank" rel="noreferrer">{pending?"Check pending transaction":"View latest transaction"}</a>:null}
    </section><aside className="mainnet-position"><dl><div><dt>Collateral</dt><dd>{position?amountText(position.collateral):"—"} <small>slisBNB</small></dd></div><div><dt>Outstanding debt</dt><dd>{position?amountText(position.debt):"—"} <small>lisUSD</small></dd></div><div><dt>Current LTV</dt><dd>{position?`${ltv.toFixed(2)}%`:"—"}</dd></div><div><dt>Borrowing APR</dt><dd>{position?`${(position.borrowApr*100).toFixed(2)}%`:"—"}</dd></div><div><dt>Additional borrowing capacity</dt><dd>{position?amountText(maxBorrow(position),2):"—"} <small>lisUSD</small></dd></div><div><dt>Available to withdraw</dt><dd>{position?amountText(maxWithdraw(position)):"—"} <small>slisBNB</small></dd></div><div><dt>Wallet BNB</dt><dd>{nativeBalance!==null?amountText(nativeBalance):"—"}</dd></div><div><dt>Wallet slisBNB</dt><dd>{position?amountText(position.slisBalance):"—"}</dd></div><div><dt>Wallet lisUSD</dt><dd>{position?amountText(position.loanBalance):"—"}</dd></div></dl><p>{position?`Read at block ${position.block.toLocaleString("en-US")}. Refresh before reviewing a new action.`:"Connect to load actual balances. No illustrative balances are shown here."}</p><a href="/app/planner">Open the economics calculator</a><a href="/docs#execution">Read transaction details</a></aside></div>
  </div>;
}
