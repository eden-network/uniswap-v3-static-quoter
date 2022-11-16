import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-abi-exporter";
import "hardhat-deploy";
import "hardhat-deploy-ethers";

dotenv.config();

function getExplorerApiKey() {
    const networkNameForEnvKey: any = {
        "avalanche": "SNOWTRACE_API_KEY",
        "mainnet": "ETHERSCAN_API_KEY",
        "arbitrum": "ARBISCAN_API_KEY",
        "optimism": "OPSCAN_API_KEY",
        "polygon": "POLYGONSCAN_API_KEY"
    }
    const [ networkName ] = process.argv.flatMap((e, i, a) => e == '--network' ? [ a[i+1] ] : [])
    const envKey = networkNameForEnvKey[networkName]
    if (envKey)
        return process.env[envKey]
}

const ETHEREUM_RPC = process.env.ETHEREUM_RPC ?? "";
const OPTIMISM_RPC = process.env.OPTIMISM_RPC ?? "";
const ARBITRUM_RPC = process.env.ARBITRUM_RPC ?? "";
const AVALANCHE_RPC = process.env.AVALANCHE_RPC ?? "";
const DOGECHAIN_RPC = process.env.DOGECHAIN_RPC ?? "";
const POLYGON_RPC = process.env.POLYGON_RPC ?? "";
const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS as string;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as string;
const ETHERSCAN_API_KEY = getExplorerApiKey();

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

const dogechainConfig = {
    url: DOGECHAIN_RPC,
    chainId: 2000,
    live: true,
    saveDeployments: true,
    accounts: [] as string[]
};

const avalancheConfig = {
    url: AVALANCHE_RPC,
    chainId: 43114,
    live: true,
    saveDeployments: true,
    accounts: [] as string[]
};

const polygonConfig = {
    url: POLYGON_RPC,
    chainId: 137,
    live: true,
    saveDeployments: true,
    accounts: [] as string[]
};

if (DEPLOYER_PRIVATE_KEY) {
    mainnetConfig.accounts.push(DEPLOYER_PRIVATE_KEY);
    optimismConfig.accounts.push(DEPLOYER_PRIVATE_KEY);
    arbitrumConfig.accounts.push(DEPLOYER_PRIVATE_KEY);
    dogechainConfig.accounts.push(DEPLOYER_PRIVATE_KEY);
    avalancheConfig.accounts.push(DEPLOYER_PRIVATE_KEY);
    polygonConfig.accounts.push(DEPLOYER_PRIVATE_KEY);
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
        arbitrum: arbitrumConfig,
        dogechain: dogechainConfig,
        avalanche: avalancheConfig,
        polygon: polygonConfig
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
        }, {
            network: "avalanche",
            chainId: 43114,
            urls: {
                apiURL: "https://api.snowtrace.io/api",
                browserURL: "https://snowtrace.io"
            }
        }, {
            network: "polygon",
            chainId: 137,
            urls: {
                apiURL: "https://api.polygonscan.com/api",
                browserURL: "https://polygonscan.com"
            }
        }]
    },
    mocha: {
        timeout: 600000000
    }
};

export default config;
