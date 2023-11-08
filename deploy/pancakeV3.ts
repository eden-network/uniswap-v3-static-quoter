import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

import addresses from "../test/addresses.json";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, log } = deployments;

  const allowedNetworks = ["bsc"];
  if (!allowedNetworks.includes(network.name))
    throw new Error(`Wrong network! Only "${allowedNetworks}" supported`);

  const contractName = "PancakeV3StaticQuoter";
  let pancakeDeployer = addresses.bsc.protocols.pancakeswapV3.pancakeDeployer;

  const args = [pancakeDeployer];
  const { deployer } = await getNamedAccounts();

  log("1) Deploy contract");
  const deployResult: any = await deploy(contractName, {
    from: deployer,
    contract: contractName,
    skipIfAlreadyDeployed: true,
    log: true,
    args,
  });

  if (deployResult.newlyDeployed)
    log(`- 🎉 Deployed at: ${deployResult.address}`);
  else
    log(
      `- ⏩ Deployment skipped, using previous deployment at: ${deployResult.address}`
    );
};

export default func;
func.tags = ["pancakeswapV3"];
