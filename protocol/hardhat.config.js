import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import { fileURLToPath } from "node:url";

const solcPath = fileURLToPath(new URL("./node_modules/solc/soljson.js", import.meta.url));

export default defineConfig({
  chainDescriptors: {
    56: { name: "BNB fork EVM compatibility", chainType: "l1", hardforkHistory: { cancun: { blockNumber: 0 } } },
  },
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    type: "solc",
    version: "0.8.28",
    path: solcPath,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris",
    },
  },
  networks: {
    mainnetFork: {
      type: "edr-simulated",
      chainType: "l1",
      hardfork: "cancun",
      chainId: 56,
      forking: { url: process.env.TESSANT_FORK_RPC || "https://rpc-bnb.blockmachine.io", ...(process.env.TESSANT_FORK_BLOCK ? {blockNumber: Number(process.env.TESSANT_FORK_BLOCK)} : {}) },
    },
    bscMainnet: {
      type: "http",
      chainType: "l1",
      chainId: 56,
      url: "https://bsc-dataseed.bnbchain.org",
    },
    bscTestnet: {
      type: "http",
      chainType: "l1",
      chainId: 97,
      url: "https://bsc-testnet-dataseed.bnbchain.org",
    },
  },
  test: {
    mocha: {
      timeout: 40_000,
    },
  },
});
