import { NextResponse } from "next/server";
import { JsonRpcProvider, FetchRequest, ZeroAddress } from "ethers";
import { FALLBACK_RATES } from "@/lib/tessant";
import { MAINNET, WAD, readPosition } from "@/lib/mainnet";
export const dynamic="force-dynamic";
export async function GET(){
  const request=new FetchRequest("https://rpc-bnb.blockmachine.io");request.timeout=8000;
  const rpc=new JsonRpcProvider(request,MAINNET.chainId,{staticNetwork:true});
  try{
    const [state,response]=await Promise.all([readPosition(rpc,ZeroAddress),fetch("https://api.lista.org/v1/stakes/latest-apr",{cache:"no-store",signal:AbortSignal.timeout(8000)})]);
    if(!response.ok)throw new Error("Staking rate unavailable");
    const stake=await response.json() as {data?:{apr?:string;time?:string}};
    const stakingApr=Number(stake.data?.apr);
    if(!Number.isFinite(stakingApr)||stakingApr<0)throw new Error("Invalid staking rate");
    const bnbPrice=Number(state.collateralPrice*state.oneBnbInSlis/WAD)/1e8;
    return NextResponse.json({bnbPrice,stakingApr,borrowApr:state.borrowApr,liquidationLtv:Number(MAINNET.lltv)/1e18,liquidity:Number(state.liquidity*state.loanPrice/WAD)/1e8,observedAt:new Date().toISOString(),live:true},{headers:{"Cache-Control":"public, s-maxage=120, stale-while-revalidate=300"}});
  }catch{
    return NextResponse.json(FALLBACK_RATES,{headers:{"Cache-Control":"public, s-maxage=30"}});
  }finally{rpc.destroy();}
}
