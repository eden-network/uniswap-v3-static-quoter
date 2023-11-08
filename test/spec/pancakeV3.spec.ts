import { abi as QUOTERV2_ABI } from "@pancakeswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json";
import { FeeAmount } from "@pancakeswap/v3-sdk";
import { BigNumber, Signer } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";

import {
  encodePath,
  forkNetwork,
  deployContract,
  ThenArgRecursive,
  encodePathPancake,
} from "../helpers";
import addresses from "../addresses.json";

const { pancakeswapV3 } = addresses.bsc.protocols;
const { tokens } = addresses.bsc;

async function fixture() {
  const [deployer] = await ethers.getSigners();
  const reference = await getQuoterV2();
  const quoter = await deployPancakeV3StaticQuoter(deployer);
  return {
    deployer,
    quoter,
    reference,
  };
}

async function getQuoterV2() {
  return ethers.getContractAt(QUOTERV2_ABI, pancakeswapV3.quoterV2);
}

async function deployPancakeV3StaticQuoter(deployer: Signer) {
  return deployContract(deployer, "PancakeV3StaticQuoter", [
    pancakeswapV3.pancakeDeployer,
  ]);
}

async function bscFixture(blockNumber: number) {
  await forkNetwork("bsc", blockNumber);
  return fixture();
}

describe("quoter", async () => {
  context("bsc", () => {
    context("33312606", async () => {
      let fix: ThenArgRecursive<ReturnType<typeof bscFixture>>;

      beforeEach(async () => {
        fix = await bscFixture(33312606);
      });

      it("wbnb .3% busd: 31337 ether", async () => {
        const amountIn = ethers.utils.parseEther("31337");
        const amountOut = BigNumber.from("2928637544428191710891");

        const params = {
          tokenIn: tokens.wbnb,
          tokenOut: tokens.busd,
          amountIn,
          fee: FeeAmount.MEDIUM,
          sqrtPriceLimitX96: 0,
        };
        const referenceOut =
          await fix.reference.callStatic.quoteExactInputSingle(params);
        expect(referenceOut.amountOut).equals(amountOut);

        const quoterOut = await fix.quoter.quoteExactInputSingle(params);
        expect(quoterOut).equals(amountOut);
      });

      it("wbnb .3% busd: 1 wei", async () => {
        const amountIn = 1;
        const amountOut = 0;

        const params = {
          tokenIn: tokens.wbnb,
          tokenOut: tokens.busd,
          amountIn,
          fee: FeeAmount.LOW,
          sqrtPriceLimitX96: 0,
        };

        const referenceOut =
          await fix.reference.callStatic.quoteExactInputSingle(params);
        expect(referenceOut.amountOut).equals(amountOut);

        const quoterOut = await fix.quoter.quoteExactInputSingle(params);
        expect(quoterOut).equals(amountOut);
      });

      it("wbnb .3% busd: max", async () => {
        const params = {
          tokenIn: tokens.wbnb,
          tokenOut: tokens.busd,
          amountIn: ethers.constants.MaxUint256,
          fee: FeeAmount.LOW,
          sqrtPriceLimitX96: 0,
        };

        await expect(fix.reference.callStatic.quoteExactInputSingle(params))
          .reverted;
        await expect(fix.quoter.quoteExactInputSingle(params)).reverted;
      });

      it("invalid token", async () => {
        const params = {
          tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc3",
          tokenOut: tokens.busd,
          amountIn: ethers.utils.parseEther("1337"),
          fee: FeeAmount.LOW,
          sqrtPriceLimitX96: 0,
        };

        await expect(fix.reference.callStatic.quoteExactInputSingle(params))
          .reverted;
        await expect(fix.quoter.quoteExactInputSingle(params)).reverted;
      });
    });

    context("33312606", async () => {
      let fix: ThenArgRecursive<ReturnType<typeof bscFixture>>;

      beforeEach(async () => {
        fix = await bscFixture(33312606);
      });

      it("busd .05% wbnb .3% comp: 31337 busd", async () => {
        const amountIn = ethers.utils.parseUnits("31337", 6);
        const amountOut = BigNumber.from("16553461");

        const path = encodePathPancake(
          [tokens.busd, tokens.wbnb, tokens.weth],
          [FeeAmount.LOW, FeeAmount.MEDIUM]
        );

        const referenceOut = await fix.reference.callStatic.quoteExactInput(
          path,
          amountIn
        );
        expect(referenceOut.amountOut).equals(amountOut);

        const quoterOut = await fix.quoter.quoteExactInput(path, amountIn);
        expect(quoterOut).equals(amountOut);
      });
    });
  });
});
