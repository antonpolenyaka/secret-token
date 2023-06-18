import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import 'solidity-coverage';

dotenv.config();

const PRIVATE_KEY: string = process.env.PRIVATE_KEY ?? '';
const INFURA_API_KEY: string = process.env.INFURA_API_KEY ?? '';
const ETHER_SCAN_API_KEY: string = process.env.ETHER_SCAN_API_KEY ?? '';

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY]
    },
    localhost: {
      url: 'http://127.0.0.1:8545/'
    }
  },
  etherscan: {
    apiKey: ETHER_SCAN_API_KEY,
  },
};

export default config;

