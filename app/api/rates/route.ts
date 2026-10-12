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
    const [state,response]=await Promise.all([readPosition(rpc,ZeroAddress),fetch("https://api.lista.org/v1/stakes/latest-apr",{cache:"no-store",signal:AbortSignal.timeout(8000)})]);
    if(!response.ok)throw new Error("Staking rate unavailable");
    const stake=await response.json() as {data?:{apr?:string;time?:string}};
    const stakingApr=Number(stake.data?.apr);
    if(!Number.isFinite(stakingApr)||stakingApr<0)throw new Error("Invalid staking rate");
    const bnbPrice=Number(state.collateralPrice*state.oneBnbInSlis/WAD)/1e8;
    return NextResponse.json({bnbPrice,stakingApr,borrowApr:state.borrowApr,liquidationLtv:Number(MAINNET.lltv)/1e18,liquidity:Number(state.liquidity*state.loanPrice/WAD)/1e8,observedAt:new Date().toISOString(),live:true},{headers:{"Cache-Control":"public, s-maxage=120, stale-while-revalidate=300"}});
  }catch(error){
    console.warn("Tessant reference rates unavailable:",error instanceof Error?error.message.slice(0,180):"upstream read failed");
    return NextResponse.json(FALLBACK_RATES,{headers:{"Cache-Control":"public, s-maxage=30"}});
  }finally{rpc.destroy();}
}
