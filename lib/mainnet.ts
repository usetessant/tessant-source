import { Contract, Interface, ZeroAddress, getAddress, type ContractRunner, type Signer } from "ethers";

export const MAINNET = {
  chainId: 56,
  rpc: "https://bsc-dataseed.bnbchain.org",
  moolah: "0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C",
  provider: "0x33f7A980a246f9B8FEA2254E3065576E127D4D5f",
  stakeManager: "0x1adB950d8bB3dA4bE104211D5AB038628e477fE6",
  collateral: "0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B",
  loan: "0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5",
  oracle: "0xf3afD82A4071f272F403dC176916141f44E6c750",
  irm: "0x5F9f9173B405C6CEAfa7f98d09e4B8447e9797E6",
  marketId: "0x7fe248d8459a88e50e8582c71219edbce1079437e58190aeab41ac503694f0a5",
  multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
  maxLtv: 150000000000000000n,
  lltv: 850000000000000000n,
} as const;
export const WAD = 10n ** 18n;
const PARAMS_TYPE = "(address loanToken,address collateralToken,address oracle,address irm,uint256 lltv)";
const MARKET_TYPE = "(uint128 totalSupplyAssets,uint128 totalSupplyShares,uint128 totalBorrowAssets,uint128 totalBorrowShares,uint128 lastUpdate,uint128 fee)";
export const MARKET_PARAMS = [MAINNET.loan, MAINNET.collateral, MAINNET.oracle, MAINNET.irm, MAINNET.lltv];
export const MOOLAH_ABI = [
  `function idToMarketParams(bytes32) view returns ${PARAMS_TYPE}`,
  `function market(bytes32) view returns ${MARKET_TYPE}`,
  "function position(bytes32,address) view returns(uint256 supplyShares,uint128 borrowShares,uint128 collateral)",
  "function providers(bytes32,address) view returns(address)",
  "function brokers(bytes32) view returns(address)",
  "function isWhiteList(bytes32,address) view returns(bool)",
  "function isAuthorized(address,address) view returns(bool)",
  "function setAuthorization(address,bool)",
  "function paused() view returns(bool)",
  "function minLoanValue() view returns(uint256)",
  `function accrueInterest(${PARAMS_TYPE})`,
  `function borrow(${PARAMS_TYPE},uint256 assets,uint256 shares,address onBehalf,address receiver) returns(uint256,uint256)`,
  `function repay(${PARAMS_TYPE},uint256 assets,uint256 shares,address onBehalf,bytes data) returns(uint256,uint256)`,
];
export const PROVIDER_ABI = [
  `function supplyCollateral(${PARAMS_TYPE},uint256 assets,address onBehalf,bytes data)`,
  `function withdrawCollateral(${PARAMS_TYPE},uint256 assets,address onBehalf,address receiver)`,
];
export const TOKEN_ABI = ["function balanceOf(address) view returns(uint256)","function allowance(address,address) view returns(uint256)","function approve(address,uint256) returns(bool)","function symbol() view returns(string)","function decimals() view returns(uint8)"];
export const STAKE_ABI = ["function deposit() payable","function paused() view returns(bool)","function convertBnbToSnBnb(uint256) view returns(uint256)"];
const ORACLE_ABI = ["function peek(address) view returns(uint256)"];

export type MainnetPosition = {
  collateral: bigint; debt: bigint; shares: bigint; liquidity: bigint;
  collateralPrice: bigint; loanPrice: bigint; oneBnbInSlis: bigint;
  slisBalance: bigint; loanBalance: bigint; minDebt: bigint;
  borrowApr: number; allowed: boolean; paused: boolean; stakePaused: boolean;
  authorized: boolean; block: number;
};
export function ceilDiv(value: bigint, denominator: bigint) { return (value + denominator - 1n) / denominator; }
export function loanValue(collateral: bigint, s: MainnetPosition) { return collateral * s.collateralPrice / s.loanPrice; }
export function maxBorrow(s: MainnetPosition, extraCollateral = 0n) {
  const capacity = loanValue(s.collateral + extraCollateral, s) * MAINNET.maxLtv / WAD;
  const remaining = capacity > s.debt ? capacity - s.debt : 0n;
  return remaining < s.liquidity ? remaining : s.liquidity;
}
export function maxWithdraw(s: MainnetPosition) {
  if (s.debt === 0n) return s.collateral;
  const required = ceilDiv(s.debt * WAD * s.loanPrice, MAINNET.maxLtv * s.collateralPrice);
  return required < s.collateral ? s.collateral - required : 0n;
}
export function validateBorrow(s: MainnetPosition, amount: bigint, extraCollateral = 0n) {
  if (s.paused || !s.allowed) throw new Error("This Lista market is not currently accepting new positions.");
  if (amount <= 0n) throw new Error("Enter a positive lisUSD amount.");
  if (amount > maxBorrow(s, extraCollateral)) throw new Error("The requested debt exceeds the 15% opening LTV or available liquidity.");
  if (s.debt + amount < s.minDebt) throw new Error("The resulting loan is below Lista’s minimum debt.");
}
export function validateRepay(s: MainnetPosition, amount: bigint, all = false) {
  if (s.debt === 0n) throw new Error("There is no outstanding debt in this market.");
  if (amount <= 0n || amount > s.loanBalance) throw new Error("Insufficient lisUSD balance for repayment.");
  if (!all && amount >= s.debt) throw new Error("Use Repay all to close the debt exactly.");
  if (!all && s.debt - amount < s.minDebt) throw new Error("The remaining debt would be below Lista’s minimum. Use Repay all.");
}

export async function verifyMainnet(runner: ContractRunner) {
  if (!runner.provider || Number((await runner.provider.getNetwork()).chainId) !== 56) throw new Error("Switch your wallet to BNB Chain.");
  const core = new Contract(MAINNET.moolah, MOOLAH_ABI, runner);
  const params = await core.idToMarketParams(MAINNET.marketId);
  for (let i=0;i<4;i++) if (getAddress(params[i]) !== getAddress(MARKET_PARAMS[i] as string)) throw new Error("Lista market configuration changed. Transactions are unavailable until reviewed.");
  if (BigInt(params[4]) !== MAINNET.lltv) throw new Error("Lista liquidation parameters changed.");
  if (getAddress(await core.providers(MAINNET.marketId, MAINNET.collateral)) !== getAddress(MAINNET.provider)) throw new Error("Lista collateral provider changed.");
  if (await core.brokers(MAINNET.marketId) !== ZeroAddress) throw new Error("This market now uses a broker and requires a new review.");
  const c=new Contract(MAINNET.collateral,TOKEN_ABI,runner), l=new Contract(MAINNET.loan,TOKEN_ABI,runner);
  if (await c.symbol() !== "slisBNB" || await l.symbol() !== "lisUSD" || Number(await c.decimals()) !== 18 || Number(await l.decimals()) !== 18) throw new Error("Unexpected asset metadata.");
}

export async function readPosition(runner: ContractRunner, account: string): Promise<MainnetPosition> {
  const core = new Interface(MOOLAH_ABI), token = new Interface(TOKEN_ABI), oracle=new Interface(ORACLE_ABI), stake=new Interface(STAKE_ABI);
  const calls: {target:string;allowFailure:boolean;callData:string}[]=[];
  const add=(target:string, abi:Interface, name:string, args:unknown[]=[])=>calls.push({target,allowFailure:false,callData:abi.encodeFunctionData(name,args)});
  add(MAINNET.moolah,core,"accrueInterest",[MARKET_PARAMS]);
  add(MAINNET.moolah,core,"market",[MAINNET.marketId]);
  add(MAINNET.moolah,core,"position",[MAINNET.marketId,account]);
  add(MAINNET.oracle,oracle,"peek",[MAINNET.collateral]);
  add(MAINNET.oracle,oracle,"peek",[MAINNET.loan]);
  add(MAINNET.stakeManager,stake,"convertBnbToSnBnb",[WAD]);
  add(MAINNET.collateral,token,"balanceOf",[account]);
  add(MAINNET.loan,token,"balanceOf",[account]);
  add(MAINNET.moolah,core,"minLoanValue");
  add(MAINNET.moolah,core,"isWhiteList",[MAINNET.marketId,account]);
  add(MAINNET.moolah,core,"paused");
  add(MAINNET.stakeManager,stake,"paused");
  add(MAINNET.moolah,core,"isAuthorized",[account,MAINNET.provider]);
  const mc=new Contract(MAINNET.multicall,["function aggregate3((address target,bool allowFailure,bytes callData)[]) payable returns((bool success,bytes returnData)[])","function getBlockNumber() view returns(uint256)"],runner);
  const raw=await mc.aggregate3.staticCall(calls);
  const decode=(i:number, abi:Interface, method:string)=>abi.decodeFunctionResult(method,raw[i].returnData);
  const m=decode(1,core,"market"),p=decode(2,core,"position");
  const cp=BigInt(decode(3,oracle,"peek")[0]),lp=BigInt(decode(4,oracle,"peek")[0]);
  if(cp<=0n||lp<=0n) throw new Error("The on-chain oracle is unavailable.");
  const irm=new Contract(MAINNET.irm,[`function borrowRateView(${PARAMS_TYPE},${MARKET_TYPE}) view returns(uint256)`],runner);
  const apr=Number(await irm.borrowRateView(MARKET_PARAMS,Array.from(m)))*31536000/1e18;
  return {
    collateral:BigInt(p.collateral), shares:BigInt(p.borrowShares),
    debt:ceilDiv(BigInt(p.borrowShares)*(BigInt(m.totalBorrowAssets)+1n),BigInt(m.totalBorrowShares)+1000000n),
    liquidity:BigInt(m.totalSupplyAssets)-BigInt(m.totalBorrowAssets),
    collateralPrice:cp,loanPrice:lp,oneBnbInSlis:BigInt(decode(5,stake,"convertBnbToSnBnb")[0]),
    slisBalance:BigInt(decode(6,token,"balanceOf")[0]),loanBalance:BigInt(decode(7,token,"balanceOf")[0]),
    minDebt:ceilDiv(BigInt(decode(8,core,"minLoanValue")[0])*WAD,lp),
    allowed:Boolean(decode(9,core,"isWhiteList")[0]),paused:Boolean(decode(10,core,"paused")[0]),stakePaused:Boolean(decode(11,stake,"paused")[0]),
    authorized:Boolean(decode(12,core,"isAuthorized")[0]),borrowApr:apr,block:Number(await mc.getBlockNumber()),
  };
}

export type Progress = (message:string, hash?:string, confirmed?:boolean)=>void;
async function send(contract:Contract, method:string, args:unknown[], progress:Progress, message:string, value=0n) {
  const signer=contract.runner as Signer;
  if(!signer.provider||Number((await signer.provider.getNetwork()).chainId)!==MAINNET.chainId)throw new Error("Switch your wallet to BNB Chain before continuing.");
  const rpc=signer.provider as typeof signer.provider & {send?:(method:string,args:unknown[])=>Promise<unknown>};
  if(rpc.send){
    const selected=await rpc.send("eth_accounts",[]) as string[];
    if(!selected[0]||getAddress(selected[0])!==getAddress(await signer.getAddress()))throw new Error("Wallet account changed. Reconnect before continuing.");
  }
  progress(message);
  const fn=contract.getFunction(method);
  const overrides=value>0n?{value}:{};
  await fn.staticCall(...args,overrides);
  const gas=await fn.estimateGas(...args,overrides);
  const tx=await fn(...args,{...overrides,gasLimit:gas*120n/100n});
  progress("Transaction submitted. Waiting for confirmation.",tx.hash,false);
  const receipt=await tx.wait(1,120000);
  if(!receipt||receipt.status!==1) throw new Error("Transaction was not confirmed. Check the transaction before trying again.");
  progress("Transaction confirmed.",tx.hash,true);
  return receipt;
}
async function approve(signer:Signer, asset:string, spender:string, amount:bigint, progress:Progress) {
  const token=new Contract(asset,TOKEN_ABI,signer);
  if(BigInt(await token.allowance(await signer.getAddress(),spender))>=amount)return;
  await send(token,"approve",[spender,amount],progress,"Approve only the amount needed for this action in your wallet.");
}
async function assertSigner(signer:Signer, account:string) {
  if(getAddress(await signer.getAddress())!==getAddress(account))throw new Error("The selected wallet account changed. Reconnect before continuing.");
  await verifyMainnet(signer);
}
export async function openPosition(signer:Signer, asset:"BNB"|"slisBNB", collateral:bigint, debt:bigint, progress:Progress) {
  const account=await signer.getAddress(); await assertSigner(signer,account);
  let s=await readPosition(signer,account);
  if(collateral<=0n)throw new Error("Enter a positive collateral amount.");
  const minted=asset==="BNB"?collateral*s.oneBnbInSlis/WAD:collateral;
  let amount=collateral;
  validateBorrow(s,debt,minted*999n/1000n);
  if(asset==="BNB") {
    if(s.stakePaused)throw new Error("BNB staking is paused.");
    const balance=await signer.provider!.getBalance(account);
    if(balance<collateral+10n**15n)throw new Error("Keep at least 0.001 BNB in your wallet for gas.");
    const before=s.slisBalance;
    await send(new Contract(MAINNET.stakeManager,STAKE_ABI,signer),"deposit",[],progress,"Stake BNB for slisBNB. Confirm in your wallet.",collateral);
    s=await readPosition(signer,account);
    amount=s.slisBalance-before;
    if(amount<=0n)throw new Error("No new slisBNB balance was detected. Refresh your wallet before continuing.");
  }
  const next=await readPosition(signer,account);
  if(next.slisBalance<amount)throw new Error("Staking completed. Select slisBNB and supply the actual wallet balance to continue.");
  validateBorrow(next,debt,amount);
  await approve(signer,MAINNET.collateral,MAINNET.provider,amount,progress);
  await send(new Contract(MAINNET.provider,PROVIDER_ABI,signer),"supplyCollateral",[MARKET_PARAMS,amount,account,"0x"],progress,"Deposit slisBNB as your collateral. Confirm in your wallet.");
  await borrowMore(signer,debt,progress);
}
export async function supplyCollateral(signer:Signer, amount:bigint, progress:Progress) {
  const account=await signer.getAddress(); await assertSigner(signer,account);
  const s=await readPosition(signer,account);
  if(s.paused||!s.allowed||amount<=0n||amount>s.slisBalance)throw new Error("Enter an available slisBNB amount in an active market.");
  await approve(signer,MAINNET.collateral,MAINNET.provider,amount,progress);
  await send(new Contract(MAINNET.provider,PROVIDER_ABI,signer),"supplyCollateral",[MARKET_PARAMS,amount,account,"0x"],progress,"Confirm the collateral deposit.");
}
export async function borrowMore(signer:Signer, amount:bigint, progress:Progress) {
  const account=await signer.getAddress(); await assertSigner(signer,account);
  validateBorrow(await readPosition(signer,account),amount);
  await send(new Contract(MAINNET.moolah,MOOLAH_ABI,signer),"borrow",[MARKET_PARAMS,amount,0n,account,account],progress,"Receive lisUSD into your own wallet. Confirm the loan.");
}
export async function repayDebt(signer:Signer, amount:bigint, all:boolean, progress:Progress) {
  const account=await signer.getAddress(); await assertSigner(signer,account);
  const s=await readPosition(signer,account);
  const budget=all?ceilDiv(s.debt*1001n,1000n)+10n**14n:amount;
  validateRepay(s,budget,all);
  await approve(signer,MAINNET.loan,MAINNET.moolah,budget,progress);
  const fresh=await readPosition(signer,account);
  if(all&&fresh.shares!==s.shares)throw new Error("Your debt changed. Refresh and review repayment again.");
  validateRepay(fresh,all?budget:amount,all);
  await send(new Contract(MAINNET.moolah,MOOLAH_ABI,signer),"repay",[MARKET_PARAMS,all?0n:amount,all?fresh.shares:0n,account,"0x"],progress,all?"Repay every outstanding debt share. Only the debt owed is spent.":"Confirm repayment from your lisUSD balance.");
}
export async function withdrawCollateral(signer:Signer, amount:bigint, progress:Progress) {
  const account=await signer.getAddress(); await assertSigner(signer,account);
  const s=await readPosition(signer,account);
  if(amount<=0n||amount>maxWithdraw(s))throw new Error("The withdrawal would exceed available collateral or the 15% LTV limit.");
  const core=new Contract(MAINNET.moolah,MOOLAH_ABI,signer);
  if(!s.authorized) await send(core,"setAuthorization",[MAINNET.provider,true],progress,"Authorize Lista’s verified provider to withdraw collateral. This permission persists until revoked.");
  if(amount>maxWithdraw(await readPosition(signer,account)))throw new Error("Your position changed. Refresh and review the withdrawal again.");
  await send(new Contract(MAINNET.provider,PROVIDER_ABI,signer),"withdrawCollateral",[MARKET_PARAMS,amount,account,account],progress,"Withdraw slisBNB to your own wallet.");
}
export async function revokeProvider(signer:Signer, progress:Progress) {
  await verifyMainnet(signer);
  await send(new Contract(MAINNET.moolah,MOOLAH_ABI,signer),"setAuthorization",[MAINNET.provider,false],progress,"Revoke the Lista collateral provider’s position-management permission.");
}
