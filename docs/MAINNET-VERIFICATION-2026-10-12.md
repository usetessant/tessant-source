# Mainnet operations verification

Date: 2026-10-12. This report describes verification, not an independent audit.

## Passed

- Local fork of BNB Mainnet at block 127112741, chain ID 56.
- Actual deployed Lista StakeManager, slisBNBProvider and Moolah contracts; no mock collateral or mocked lending venue.
- Synthetic local wallets routed through ethers BrowserProvider, matching the website's wallet transport.
- BNB staking, exact minted slisBNB collateral supply and borrowing lisUSD.
- Partial repayment, exact full repayment by shares, zero remaining debt.
- Full collateral withdrawal and provider permission revocation.
- Reopening using existing wallet slisBNB, adding collateral and additional borrowing.
- Rejection when the selected wallet account changed before the next transaction.
- Validation of opening LTV, minimum debt, partial-repayment dust, market pause/allowlist and insufficient balances.
- Existing Solidity suite: 11 tests passed. These include policy/sandbox tests, which are separate from the actual-market fork test.
- TypeScript checks and production builds for the GitHub Next.js source and hosted Vinext build.
- Production dependency audits reported zero known vulnerabilities after compatible updates. Development-tool advisories remain; no forced major framework migration was applied.

## Operational limits

No real funded mainnet transaction was submitted in this verification. Wallet signing is a user action. Fork execution uses Cancun-compatible EVM rules rather than a complete BNB consensus emulator.

Public RPCs may prune historical state or apply rate limits. Initial attempts encountered those infrastructure errors. The final expanded test passed against the same pinned block using the supported archive source; no real transaction was retried.

Scheduled selling of staking yield and automatic repayment are not implemented or enabled. slisBNB redemption-value accrual and lisUSD debt are distinct. The app supports wallet-confirmed repayment from wallet lisUSD.

The prior TessantCreditPolicy contract is not a vault or execution router. No redeployment of that record is needed for the direct Lista operations.
