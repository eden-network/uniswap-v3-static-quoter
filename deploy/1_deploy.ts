import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { abi as QUOTERV2_ABI } from "@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deploy, log } = deployments;

    const { deployer } = await getNamedAccounts();

    const quoterV2 = new ethers.Contract(
        "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
        QUOTERV2_ABI,
        ethers.provider
    );
    const factory = await quoterV2.factory();
    const weth = await quoterV2.WETH9();

    const contractName = "UniswapV3StaticQuoter";

    log("1) Deploy contract");
    const deployResult: any = await deploy(contractName, {
        from: deployer,
        contract: contractName,
        skipIfAlreadyDeployed: true,
        log: true,
        args: [factory, weth]
    });

    if (deployResult.newlyDeployed) {
        log(`- Factory: ${factory}`);
        log(`- WETH9: ${weth}`);
    }
    else
        log(`- Deployment skipped, using previous deployment at: ${deployResult.address}`);
};

export default func;
func.tags = ['1', 'Deploy']
