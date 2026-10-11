export const TESSANT = {
  domain: "https://usetessant.xyz",
  x: "https://x.com/use_tessant",
  xHandle: "@use_tessant",
  chainId: 56,
  chainName: "BNB Smart Chain",
  listaUrl: "https://lista.org/borrow",
} as const;

export type MarketRates = {
  bnbPrice: number;
  stakingApr: number;
  borrowApr: number;
  liquidationLtv: number;
  liquidity: number;
  observedAt: string;
  live: boolean;
};

export const FALLBACK_RATES: MarketRates = {
  bnbPrice: 750,
  stakingApr: 0.00886,
  borrowApr: 0.0452880018,
  liquidationLtv: 0.8,
  liquidity: 18_552_545.79,
  observedAt: "2026-10-11T00:00:00.000Z",
  live: false,
};

export function calculatePosition(bnb: number, ltv: number, rates: MarketRates) {
  const collateralValue = Math.max(0, bnb) * rates.bnbPrice;
  const debt = collateralValue * Math.max(0, ltv);
  const rewards = collateralValue * rates.stakingApr;
  const interest = debt * rates.borrowApr;
  const netPaydown = rewards - interest;
  const breakEvenLtv = rates.borrowApr > 0 ? rates.stakingApr / rates.borrowApr : 0;
  const liquidationPrice = bnb > 0 && rates.liquidationLtv > 0 ? debt / (bnb * rates.liquidationLtv) : 0;
  const healthFactor = debt > 0 ? (collateralValue * rates.liquidationLtv) / debt : Number.POSITIVE_INFINITY;

  return { collateralValue, debt, rewards, interest, netPaydown, breakEvenLtv, liquidationPrice, healthFactor };
}
