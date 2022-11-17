import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

import addresses from "../test/addresses.json";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network } = hre;
    const { deploy, log } = deployments;

    // KyberElastic has the same deployment address for factory across multiple networks 
    const allowedNetworks = ["avalanche", "mainnet", "optimism", "arbitrum", "polygon"]
    if (!allowedNetworks.includes(network.name))
        throw new Error(`Wrong network! Only "${allowedNetworks}" supported`);
    const networkAddresses: any = Object.entries(addresses).find(([key, _]) => key == network.name)?.[1];

    const contractName = "KyberStaticQuoter";
    const args = [ networkAddresses.protocols.kyber.factory ]
    const { deployer } = await getNamedAccounts();

    log("1) Deploy contract");
    const deployResult: any = await deploy(contractName, {
        from: deployer,
        contract: contractName,
        skipIfAlreadyDeployed: true,
        log: true,
        args
    });

    if (deployResult.newlyDeployed)
        log(`- 🎉 Deployed at: ${deployResult.address}`);   
    else
        log(`- ⏩ Deployment skipped, using previous deployment at: ${deployResult.address}`);
};

export default func;
func.tags = [ "kyber" ];
