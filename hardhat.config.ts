import { HardhatUserConfig, task } from "hardhat/config";
import * as dotenv from "dotenv";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-abi-exporter";
import "hardhat-deploy";
import "hardhat-deploy-ethers";

dotenv.config();

const ETHEREUM_RPC = process.env.ETHEREUM_RPC ?? "";
const OPTIMISM_RPC = process.env.OPTIMISM_RPC ?? "";
const ARBITRUM_RPC = process.env.ARBITRUM_RPC ?? "";
const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS as string;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as string;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

const mainnetConfig = {
    url: ETHEREUM_RPC,
    chainId: 1,
    live: true,
    saveDeployments: true,
    accounts: [] as string[]
};

const optimismConfig = {
    url: OPTIMISM_RPC,
    chainId: 10,
    live: true,
    saveDeployments: true,
    accounts: [] as string[]
};

const arbitrumConfig = {
    url: ARBITRUM_RPC,
    chainId: 42161,
    live: true,
    saveDeployments: true,
    accounts: [] as string[]
};

if (DEPLOYER_PRIVATE_KEY) {
    mainnetConfig.accounts.push(DEPLOYER_PRIVATE_KEY);
    optimismConfig.accounts.push(DEPLOYER_PRIVATE_KEY);
    arbitrumConfig.accounts.push(DEPLOYER_PRIVATE_KEY);
}

const config: HardhatUserConfig = {
    solidity: {
        version: "0.7.6",
        settings: {
            evmVersion: 'istanbul',
            optimizer: {
                enabled: true,
                runs: 1_000_000,
            },
            metadata: {
                bytecodeHash: 'none',
            },
        },
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            live: false,
            saveDeployments: false,
        },
        mainnet: mainnetConfig,
        optimism: optimismConfig,
        arbitrum: arbitrumConfig
    },
    namedAccounts: {
        deployer: {
            default: 0,
            1: DEPLOYER_ADDRESS,
            10: DEPLOYER_ADDRESS,
            42161: DEPLOYER_ADDRESS
        }
    },
    abiExporter: {
        path: './abis',
        clear: true,
        flat: true,
        only: [':UniswapV3StaticQuoter']
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
        customChains: [{
            network: "mainnet",
            chainId: 1,
            urls: {
                apiURL: "https://api.etherscan.io/api",
                browserURL: "https://etherscan.io"
            }
        }, {
            network: "optimism",
            chainId: 10,
            urls: {
                apiURL: "https://api-optimistic.etherscan.io/api",
                browserURL: "https://optimistic.etherscan.io"
            }
        }, {
            network: "arbitrum",
            chainId: 42161,
            urls: {
                apiURL: "https://api.arbiscan.io/api",
                browserURL: "https://arbiscan.io"
            }
        }]
    },
    mocha: {
        timeout: 60000
    }
};

export default config;
