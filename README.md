# Tessant

Tessant is a BNB Chain position-planning interface for low-LTV lisUSD credit backed by staked BNB. It compares base staking rewards with borrowing interest and sends users to Lista for the underlying mainnet position.

[Website](https://usetessant.xyz/) · [X](https://x.com/use_tessant)

## Current scope

- Live reference data from Lista and CoinGecko, with a clearly labelled fallback snapshot
- Position sizing, break-even LTV, health factor and liquidation-price estimates
- BNB Chain wallet connection and network switching
- An isolated BSC Testnet accounting sandbox with tBNB and mock lisUSD
- An immutable, non-custodial policy contract for reviewed dependencies and starting LTV

Tessant does not currently custody assets or automate the production staking, borrowing, harvesting, swapping or repayment transactions. Those transactions remain on the underlying protocols.

## Local development

```bash
npm install
npm run dev
```

Run the production checks with:

```bash
npm run lint
npm run build
```

## Contracts

The `protocol/` directory contains the immutable policy contract, an isolated BSC Testnet sandbox and their tests.

```bash
cd protocol
npm install
npm run compile
npm test
```

The sandbox is not a Lista market and does not represent production liquidity or yield. No sandbox address is enabled in the interface until a deployment is configured and verified.

## Configuration

Copy `.env.example` to `.env.local` and set only verified public contract addresses. Never commit private keys or deployment journals.

## License

[MIT](LICENSE)
