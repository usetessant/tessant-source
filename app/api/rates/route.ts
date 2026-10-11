import { NextResponse } from "next/server";
import { FALLBACK_RATES } from "@/lib/tessant";

export const dynamic = "force-dynamic";

type Json = Record<string, unknown>;

const UPSTREAM_TIMEOUT_MS = 8_000;

function finiteNumber(value: unknown, label: string) {
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0) {
    throw new Error(`Invalid ${label}`);
  }
  return result;
}

export async function GET() {
  try {
    const [stakeResponse, marketResponse, priceResponse] = await Promise.all([
      fetch("https://api.lista.org/v1/stakes/latest-apr", {
        cache: "no-store",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      }),
      fetch("https://api.lista.org/api/cdp/market/list?page=1&limit=100", {
        cache: "no-store",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      }),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd", {
        cache: "no-store",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      }),
    ]);

    if (!stakeResponse.ok || !marketResponse.ok || !priceResponse.ok) throw new Error("Upstream rate request failed");

    const stake = (await stakeResponse.json()) as Json;
    const markets = (await marketResponse.json()) as Json;
    const price = (await priceResponse.json()) as Json;
    const stakeData = stake.data as Json | undefined;
    const marketData = markets.data as Json | undefined;
    const marketList = marketData?.list;
    if (!stakeData || !Array.isArray(marketList)) throw new Error("Unexpected upstream payload");
    const slisBnb = marketList.find((item) => item.collateralTokenSymbol === "slisBNB");
    if (!slisBnb) throw new Error("slisBNB market unavailable");

    const priceData = price.binancecoin as Json | undefined;
    if (!priceData) throw new Error("BNB price unavailable");

    return NextResponse.json({
      bnbPrice: finiteNumber(priceData.usd, "BNB price"),
      stakingApr: finiteNumber(stakeData.apr, "staking APR"),
      borrowApr: finiteNumber(slisBnb.borrowRate, "borrow APR"),
      liquidationLtv: finiteNumber(slisBnb.lltv, "liquidation LTV"),
      liquidity: finiteNumber(slisBnb.liquidity, "market liquidity"),
      observedAt: new Date().toISOString(),
      live: true,
    }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json(FALLBACK_RATES, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" },
    });
  }
}
