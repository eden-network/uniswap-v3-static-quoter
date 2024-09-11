import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";

import { 
    encodePathNoFees,
    ThenArgRecursive, 
    deployContract, 
    forkNetwork
} from "../helpers";
import addresses from "../addresses.json";


const { tokens } = addresses.polygon
const { quickswap } = addresses.polygon.protocols

async function polygonFixture(blockNumber: number) {
    await forkNetwork("polygon", blockNumber);
    return fixture();
}

async function fixture() {
    const StaticQuoter = await deployAlgebraStaticQuoter()
    const OriginalQuoter = await getAlgebraQuoterV2()
    return { StaticQuoter, OriginalQuoter }    
}

async function deployAlgebraStaticQuoter() {
    const [ deployer ] = await ethers.getSigners() 
    return deployContract(
        deployer, 
        "AlgebraStaticQuoter",
        [quickswap.factory]
    );
}

async function getAlgebraQuoterV2() {
    return ethers.getContractAt(
        require("../../abis/AlgebraQuoterV2.json"),
        quickswap.quoterV2
    );
}

describe("Quoter:Quickswap", async () => {

    context("polygon", () => {

        async function checkStaticMatchesOriginalSingle(
            amountIn: BigNumber, 
            tokenIn: string, 
            tokenOut: string,
        ) {
            const params = {sqrtPriceLimitX96: 0, amountIn, tokenIn, tokenOut}
            const dyOriginal = await getOriginalQuoterV2QuoteSingle(params);
            const dyStatic = await fix.StaticQuoter.quoteExactInputSingle(params);
            expect(dyStatic).to.eq(dyOriginal);
            logGasEstimate(params);
        }

        async function checkStaticMatchesOriginalPath(
            amountIn: BigNumber, 
            tokens: string[],
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

        async function getOriginalQuoterV2QuotePath(path: any, amountIn: BigNumber) {
            return fix.OriginalQuoter.callStatic.quoteExactInput(path, amountIn);
        }

        async function logGasEstimate(params: any) {
            const gas = await fix.StaticQuoter.estimateGas.quoteExactInputSingle(params)
            console.log(`Gas: ${gas.toString()}`)
        }

        let fix: ThenArgRecursive<ReturnType<typeof polygonFixture>>;

        context("35715813", async () => {
            const FORK_BLOCK = 35715813;

            beforeEach(async () => {
                fix = await polygonFixture(FORK_BLOCK); 
            });


            context("static-Quoter and original-Quoter quotes match :: single", async () => {

                it("WETH -> WBTC :: 1 WETH", async () => {
                    await checkStaticMatchesOriginalSingle(
                        ethers.utils.parseUnits("1", 18),
                        tokens.weth,
                        tokens.wbtc
                    )
                })

                it("WBTC -> WETH :: 4 WBTC", async () => {
                    await checkStaticMatchesOriginalSingle(
                        ethers.utils.parseUnits("4", 8),
                        tokens.wbtc,
                        tokens.weth
                    )
                })

                it("USDC.e -> WETH :: 33_000 USDC", async () => {
                    await checkStaticMatchesOriginalSingle(
                        ethers.utils.parseUnits("33000", 6),
                        tokens.usdce,
                        tokens.weth
                    )
                })

            })

            context("static-Quoter and original-Quoter quotes match :: path", async () => {

                it("USDC --> WETH --> WBTC :: 10_000 USDC", async () => {
                    await checkStaticMatchesOriginalPath(
                        ethers.utils.parseUnits("10000", 6),
                        [tokens.usdce, tokens.weth, tokens.wbtc],
                    )
                })

                it("WBTC --> WETH --> USDC.e -> USDT :: 1 WBTC", async () => {
                    await checkStaticMatchesOriginalPath(
                        ethers.utils.parseUnits("1", 8),
                        [tokens.wbtc, tokens.weth, tokens.usdce, tokens.usdt],
                    )
                })

            })

        });
    });

})