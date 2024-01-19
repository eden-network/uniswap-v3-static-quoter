import { abi as QUOTERV2_ABI } from "@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";

import { forkNetwork, deployContract, ThenArgRecursive } from "../helpers";
import addresses from "../addresses.json";

const { ramses } = addresses.arbitrum.protocols;
const { tokens } = addresses.arbitrum;

async function fixture() {
    const [ deployer ] = await ethers.getSigners();
    const reference = await getQuoterV2();
    const quoter = await deployUniswapV3StaticQuoter(deployer);
    return {
        deployer,
        quoter,
        reference
    };
}

async function getQuoterV2() {
    return ethers.getContractAt(QUOTERV2_ABI, ramses.quoterV2);
}

async function deployUniswapV3StaticQuoter(deployer: Signer) {
    return deployContract(
        deployer, 
        "RamsesStaticQuoter", 
        [ramses.factory]
    )
}

async function ethereumFixture(blockNumber: number) {
    await forkNetwork("arbitrum", blockNumber);
    return fixture();
}

describe("quoter", async () => {
    context("ethereum", () => {

        context("171319500", async () => {
            let fix: ThenArgRecursive<ReturnType<typeof ethereumFixture>>;

            beforeEach(async () => {
                fix = await ethereumFixture(171319500);
            });
            
            it("arb .3% weth: 50 arb", async () => {
                const amountIn = ethers.utils.parseEther("50");
    
                const params = {
                    tokenIn: tokens.arb,
                    tokenOut: tokens.weth,
                    amountIn,
                    fee: 500,
                    sqrtPriceLimitX96: 0
                };
    
                const referenceOut = await fix.reference.callStatic.quoteExactInputSingle(params);
                const quoterOut = await fix.quoter.quoteExactInputSingle(params);

                expect(quoterOut).equals(referenceOut.amountOut);
            });

            it("arb .3% weth: 1 wei", async () => {
                const amountIn = 1;
                const amountOut = 0;
    
                const params = {
                    tokenIn: tokens.arb,
                    tokenOut: tokens.weth,
                    amountIn,
                    fee: 500,
                    sqrtPriceLimitX96: 0
                };
    
                const referenceOut = await fix.reference.callStatic.quoteExactInputSingle(params);
                expect(referenceOut.amountOut).equals(amountOut);
    
                const quoterOut = await fix.quoter.quoteExactInputSingle(params);
                expect(quoterOut).equals(amountOut);
            });

            it("arb .3% weth: max", async () => {
                const params = {
                    tokenIn: tokens.arb,
                    tokenOut: tokens.weth,
                    amountIn: ethers.constants.MaxUint256,
                    fee: 500,
                    sqrtPriceLimitX96: 0
                };
    
                await expect(fix.reference.callStatic.quoteExactInputSingle(params)).reverted;
                await expect(fix.quoter.quoteExactInputSingle(params)).reverted;
            });

            it("invalid token", async () => {
                const params = {
                    tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc3",
                    tokenOut: tokens.weth,
                    amountIn: ethers.utils.parseEther("1337"),
                    fee: 500,
                    sqrtPriceLimitX96: 0
                };

                await expect(fix.reference.callStatic.quoteExactInputSingle(params)).reverted;
                await expect(fix.quoter.quoteExactInputSingle(params)).reverted;
            });
        });
    });
});
