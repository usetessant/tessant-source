# Tessant

BNB Mainnet interface for low-LTV lisUSD credit backed by staked BNB.

[Website](https://usetessant.xyz/) · [X](https://x.com/use_tessant) · [Mainnet app](https://usetessant.xyz/app)

## Implemented operations

- Convert BNB to slisBNB through Lista StakeManager
- Supply existing or newly minted slisBNB through Lista's market provider
- Borrow lisUSD directly into the wallet
- Read actual collateral, debt shares, accrued debt, market prices and borrowing APR
- Repay partially or close all debt shares exactly
- Withdraw eligible slisBNB and revoke the provider's management permission
- Switch to BNB Chain, recheck configuration and wallet account before sending
- Persist only a pending transaction hash locally to avoid blind resubmission
- Keep the illustrative economics calculator separate at /app/planner

Every production transaction requires the user's wallet signature. The interface opening limit is 15% LTV; the selected Lista market has 85% liquidation LTV. This is not a guarantee.

## Economic boundary

Staking rewards accrue in slisBNB's redemption value. They are not automatically converted into lisUSD. Scheduled yield harvesting, swaps and automatic debt repayment are not implemented or enabled. This release must not be described as fully automated.

The old TessantCreditPolicy contract is only an immutable dependency/policy record. It does not custody assets or execute loans. The mainnet app connects directly to the verified Lista Moolah market pinned in lib/mainnet.ts. Legacy allowlisted CDP dependencies are not used for new positions.

## Local development

Use Node 24. Install dependencies in both the root and protocol directories.

```bash
npm install
npm run dev
npm run typecheck
npm run build
cd protocol
npm install
npm test
node scripts/mainnet-validation.mjs
npx hardhat run scripts/mainnet-fork.mjs --network mainnetFork
```

The fork test uses synthetic funded local accounts against actual deployed BNB Mainnet contract state. It never sends transactions to the live chain. The default read-only archive RPC is listed in BNB Chain's official documentation. Set TESSANT_FORK_RPC and optionally TESSANT_FORK_BLOCK to use another archive source.

The local fork uses Cancun-compatible EVM execution and does not emulate BNB consensus or every chain-specific rule. Passing it is not evidence of a funded live mainnet transaction or an independent audit.

The protocol directory also retains the isolated mock-asset sandbox for development tests. It is not linked from the public app; the legacy /testnet route redirects to /app.

## Configuration and privacy

Never commit private keys, environment secrets, deployment receipts containing private information or personal files. No mainnet private key is required by the website. Contract and token addresses in lib/mainnet.ts are public protocol dependencies, not invented project-token addresses.

## License

[MIT](LICENSE)
