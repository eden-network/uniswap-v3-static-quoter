import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";

import {
  encodePathNoFees,
  ThenArgRecursive,
  deployContract,
  forkNetwork,
} from "../helpers";
import addresses from "../addresses.json";

const { tokens } = addresses.arbitrum;
const { camelot } = addresses.arbitrum.protocols;

async function arbitrumFixture(blockNumber: number) {
  await forkNetwork("arbitrum", blockNumber);
  return fixture();
}

async function fixture() {
  const StaticQuoter = await deployAlgebraStaticQuoter();
  const OriginalQuoter = await getAlgebraQuoterV2();
  return { StaticQuoter, OriginalQuoter };
}

async function deployAlgebraStaticQuoter() {
  const [deployer] = await ethers.getSigners();
  return deployContract(deployer, "AlgebraStaticQuoter", [camelot.factory]);
}

async function getAlgebraQuoterV2() {
  return ethers.getContractAt(
    require("../../abis/AlgebraQuoterV2.json"),
    camelot.quoterV2
  );
}

describe("Quoter:Quickswap", async () => {
  context("arbitrum", () => {
    async function checkStaticMatchesOriginalSingle(
      amountIn: BigNumber,
      tokenIn: string,
      tokenOut: string
    ) {
      const params = { sqrtPriceLimitX96: 0, amountIn, tokenIn, tokenOut };
      const dyOriginal = await getOriginalQuoterV2QuoteSingle(params);
      const dyStatic = await fix.StaticQuoter.quoteExactInputSingle(params);
      expect(dyStatic).to.eq(dyOriginal);
      logGasEstimate(params);
    }

    async function checkStaticMatchesOriginalPath(
      amountIn: BigNumber,
      tokens: string[]
    ) {
      const path = encodePathNoFees(tokens);
      const dyOriginal = await getOriginalQuoterV2QuotePath(path, amountIn);
      const dyStatic = await fix.StaticQuoter.quoteExactInput(path, amountIn);
      expect(dyStatic).to.eq(dyOriginal);
    }

    async function getOriginalQuoterV2QuoteSingle(params: any) {
      return fix.OriginalQuoter.callStatic.quoteExactInputSingle(
        params.tokenIn,
        params.tokenOut,
        params.amountIn,
        params.sqrtPriceLimitX96
      );
    }

    async function getOriginalQuoterV2QuotePath(
      path: any,
      amountIn: BigNumber
    ) {
      return fix.OriginalQuoter.callStatic.quoteExactInput(path, amountIn);
    }

    async function logGasEstimate(params: any) {
      const gas = await fix.StaticQuoter.estimateGas.quoteExactInputSingle(
        params
      );
      console.log(`Gas: ${gas.toString()}`);
    }

    let fix: ThenArgRecursive<ReturnType<typeof arbitrumFixture>>;

    context("130105395", async () => {
      const FORK_BLOCK = 130105395;

      beforeEach(async () => {
        fix = await arbitrumFixture(FORK_BLOCK);
      });

      context(
        "static-Quoter and original-Quoter quotes match :: single",
        async () => {
          it("ARB -> WETH :: 100 ARB", async () => {
            await checkStaticMatchesOriginalSingle(
              ethers.utils.parseUnits("100", 18),
              tokens.arb,
              tokens.weth
            );
          });

          it("ARB -> WETH :: 1000 ARB", async () => {
            await checkStaticMatchesOriginalSingle(
              ethers.utils.parseUnits("1000", 18),
              tokens.arb,
              tokens.weth
            );
          });

          it("USDC -> WETH :: 100 USDC", async () => {
            await checkStaticMatchesOriginalSingle(
              ethers.utils.parseUnits("1000", 6),
              tokens.usdc,
              tokens.weth
            );
          });
        }
      );
    });
  });
});
