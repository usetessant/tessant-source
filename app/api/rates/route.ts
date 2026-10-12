import { NextResponse } from "next/server";
import { JsonRpcApiProvider, ZeroAddress, type JsonRpcPayload, type JsonRpcResult, type JsonRpcError } from "ethers";
import { FALLBACK_RATES } from "@/lib/tessant";
import { MAINNET, WAD, readPosition } from "@/lib/mainnet";
export const dynamic="force-dynamic";
class NativeFetchRpc extends JsonRpcApiProvider {
  constructor(){super(MAINNET.chainId,{staticNetwork:true});this._start();}
  async _send(payload:JsonRpcPayload|JsonRpcPayload[]):Promise<(JsonRpcResult|JsonRpcError)[]> {
    const response=await fetch(MAINNET.rpc,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error(`RPC HTTP ${response.status}`);
    const result=await response.json() as JsonRpcResult|JsonRpcError|(JsonRpcResult|JsonRpcError)[];
    return Array.isArray(result)?result:[result];
  }
}
export async function GET(){
  const rpc=new NativeFetchRpc();
  try{
    const [state,stake]=await Promise.all([readPosition(rpc,ZeroAddress),fetch("https://api.lista.org/v1/stakes/latest-apr",{cache:"no-store",signal:AbortSignal.timeout(8000)}).then(async response=>response.ok?await response.json() as {data?:{apr?:string;time?:string}}:null).catch(()=>null)]);
    const observedStakingApr=Number(stake?.data?.apr);
    const stakingLive=!!stake&&Number.isFinite(observedStakingApr)&&observedStakingApr>=0;
    const stakingApr=stakingLive?observedStakingApr:FALLBACK_RATES.stakingApr;
    const bnbPrice=Number(state.collateralPrice*state.oneBnbInSlis/WAD)/1e8;
    return NextResponse.json({bnbPrice,stakingApr,stakingLive,stakingObservedAt:stakingLive?stake?.data?.time:"2026-10-11",borrowApr:state.borrowApr,liquidationLtv:Number(MAINNET.lltv)/1e18,liquidity:Number(state.liquidity*state.loanPrice/WAD)/1e8,observedAt:new Date().toISOString(),live:true},{headers:{"Cache-Control":"public, s-maxage=120, stale-while-revalidate=300"}});
  }catch(error){
    console.warn("Tessant reference rates unavailable:",error instanceof Error?error.message.slice(0,180):"upstream read failed");
    return NextResponse.json({...FALLBACK_RATES,unavailableReason:error instanceof Error?error.message.split("\\n")[0].slice(0,160):"upstream unavailable"},{headers:{"Cache-Control":"no-store"}});
  }finally{rpc.destroy();}
}
