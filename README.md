# Tessant

Tessant is a BNB Chain mainnet position-planning interface for low-LTV lisUSD credit backed by staked BNB. It compares base staking rewards with borrowing interest and sends users to Lista for the underlying position.

[Website](https://usetessant.xyz/) · [X](https://x.com/use_tessant)

## Mainnet release

- Live reference data from Lista and CoinGecko, with a clearly labelled fallback snapshot
- Position sizing, break-even LTV, health factor and liquidation-price estimates
- BNB Chain wallet connection and network switching
- An immutable, non-custodial policy contract deployed on BNB Chain mainnet
- Mainnet policy contract: [`0x644d60B3040FB536FA694aBb6719Ee749dB2541C`](https://bscscan.com/address/0x644d60B3040FB536FA694aBb6719Ee749dB2541C)

Tessant does not currently custody assets or automate the production staking, borrowing, harvesting, swapping or repayment transactions. Those transactions remain on the underlying protocols.

## Development environment

The repository also contains an isolated BSC Testnet accounting sandbox with tBNB and mock lisUSD. It is used for development and transaction-flow testing only; it is not the public Tessant product or a Lista market.

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
