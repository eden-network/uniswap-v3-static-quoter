import { abi as QUOTERV2_ABI } from "@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json";
import { FeeAmount } from "@uniswap/v3-sdk";
import { BigNumber, Signer } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";

import { encodePath, forkNetwork, deployContract, ThenArgRecursive } from "../helpers";
import addresses from "../addresses.json";

const { fusion } = addresses.mantle.protocols;
const { tokens } = addresses.mantle;

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
    return ethers.getContractAt(QUOTERV2_ABI, fusion.quoterV2);
}

async function deployUniswapV3StaticQuoter(deployer: Signer) {
    return deployContract(
        deployer, 
        "UniswapV3StaticQuoter", 
        [fusion.factory, false]
    )
}

async function ethereumFixture(blockNumber: number) {
    await forkNetwork("mantle", blockNumber);
    return fixture();
}

describe("quoter", async () => {
    context("mantle", () => {

        context("41733921", async () => {
            let fix: ThenArgRecursive<ReturnType<typeof ethereumFixture>>;

            beforeEach(async () => {
                fix = await ethereumFixture(41733921);
            });
            
            it("weth .25% usdc: 1 eth", async () => {
                const amountIn = ethers.utils.parseEther("1");
                const amountOut = BigNumber.from("2267941435");

                const params = {
                    tokenIn: tokens.weth,
                    tokenOut: tokens.usdc,
                    amountIn,
                    fee: 500,
                    sqrtPriceLimitX96: 0
                };
    
                const referenceOut = await fix.reference.callStatic.quoteExactInputSingle(params);
                expect(referenceOut.amountOut).equals(amountOut);
                console.log("quoterV2 done");
                const quoterOut = await fix.quoter.quoteExactInputSingle(params);
                expect(quoterOut).equals(amountOut);
            });

            it("weth .3% usdc: 1 wei", async () => {
                const amountIn = 1;
                const amountOut = 0;
    
                const params = {
                    tokenIn: tokens.weth,
                    tokenOut: tokens.usdc,
                    amountIn,
                    fee: 500,
                    sqrtPriceLimitX96: 0
                };
    
                const referenceOut = await fix.reference.callStatic.quoteExactInputSingle(params);
                expect(referenceOut.amountOut).equals(amountOut);
    
                const quoterOut = await fix.quoter.quoteExactInputSingle(params);
                expect(quoterOut).equals(amountOut);
            });

            it("weth .3% usdc: max", async () => {
                const params = {
                    tokenIn: tokens.weth,
                    tokenOut: tokens.usdc,
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
                    tokenOut: tokens.usdc,
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
