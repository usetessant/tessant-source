export const TESSANT = {
  domain: "https://usetessant.xyz",
  x: "https://x.com/use_tessant",
  xHandle: "@use_tessant",
  chainId: 56,
  chainName: "BNB Smart Chain",
  listaUrl: "https://lista.org/lending",
} as const;

export type MarketRates = {
  bnbPrice: number;
  stakingApr: number;
  borrowApr: number;
  liquidationLtv: number;
  liquidity: number;
  observedAt: string;
  live: boolean;
  stakingLive?: boolean;
  stakingObservedAt?: string;
};

export const FALLBACK_RATES: MarketRates = {
  bnbPrice: 750,
  stakingApr: 0.00730,
  borrowApr: 0.0304343873,
  liquidationLtv: 0.85,
  liquidity: 11_335_474.99,
  observedAt: "2026-10-12T00:00:00.000Z",
  live: false,
  stakingLive: false,
  stakingObservedAt: "2026-10-11",
};

export function calculatePosition(bnb: number, ltv: number, rates: MarketRates) {
  const collateralValue = (Number.isFinite(bnb) ? Math.max(0, bnb) : 0) * rates.bnbPrice;
  const debt = collateralValue * (Number.isFinite(ltv) ? Math.max(0, Math.min(1, ltv)) : 0);
  const rewards = collateralValue * rates.stakingApr;
  const interest = debt * rates.borrowApr;
  const netPaydown = rewards - interest;
  const breakEvenLtv = rates.borrowApr > 0 ? rates.stakingApr / rates.borrowApr : 0;
  const liquidationPrice = bnb > 0 && rates.liquidationLtv > 0 ? debt / (bnb * rates.liquidationLtv) : 0;
  const healthFactor = debt > 0 ? (collateralValue * rates.liquidationLtv) / debt : Number.POSITIVE_INFINITY;

  return { collateralValue, debt, rewards, interest, netPaydown, breakEvenLtv, liquidationPrice, healthFactor };
}

export function isMarketRates(value: unknown): value is MarketRates {
  if (!value || typeof value !== "object") return false;
  const rates = value as MarketRates;
  return [rates.bnbPrice, rates.stakingApr, rates.borrowApr, rates.liquidationLtv, rates.liquidity].every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0)
    && rates.bnbPrice > 0 && rates.liquidationLtv > 0 && rates.liquidationLtv <= 1
    && typeof rates.live === "boolean" && typeof rates.observedAt === "string";
}

export async function loadReferenceRates(signal:AbortSignal):Promise<MarketRates>{
  const [market,stake]=await Promise.all([
    fetch("/api/rates",{signal}).then(async r=>{if(!r.ok)throw new Error("Market data unavailable");const d:unknown=await r.json();return isMarketRates(d)?d:FALLBACK_RATES;}).catch(()=>FALLBACK_RATES),
    fetch("https://api.lista.org/v1/stakes/latest-apr",{signal:AbortSignal.any([signal,AbortSignal.timeout(8000)])}).then(async r=>{if(!r.ok)return null;return await r.json() as {data?:{apr?:string;time?:string}};}).catch(()=>null),
  ]);
  const apr=Number(stake?.data?.apr);
  return stake&&Number.isFinite(apr)&&apr>=0?{...market,stakingApr:apr,stakingLive:true,stakingObservedAt:stake.data?.time}:market;
}
