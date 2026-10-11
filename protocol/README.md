# Tessant contracts

This package contains two separate pieces:

- `TessantCreditPolicy` is an immutable, ownerless and non-custodial anchor for reviewed Lista dependencies and a maximum starting LTV.
- `TessantCreditSandbox` is an isolated BSC Testnet accounting demonstration using tBNB and mock lisUSD.

Neither contract opens or services a production Lista position. The policy contract cannot hold funds, borrow, repay or receive approvals. The sandbox does not represent production liquidity, pricing or yield.

## Verify locally

```bash
npm install
npm run compile
npm test
```

The sandbox uses fixed illustrative inputs:

- BNB reference price: 750 USD
- Base reward APR: 0.886%
- Borrow APR: 4.5288%
- Maximum opening LTV: 45%
- Test liquidation threshold: 80%

Deployment records, signed transaction journals and local environment files are intentionally excluded from source control.
