require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY       = process.env.ETH_PRIVATE_KEY    || "";
const ETH_RPC_URL       = process.env.ETH_RPC_URL        || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY  || "";

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: ETH_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },
  paths: {
    sources: './contracts',
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};
