import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";

import { 
    ThenArgRecursive, 
    deployContract,
    forkNetwork,
    encodePath,
} from "../helpers";
import addresses from "../addresses.json";

const { tokens } = addresses.arbitrum
const { kyber } = addresses.arbitrum.protocols


async function arbitrumFixture(blockNumber: number) {
    await forkNetwork("arbitrum", blockNumber);
    return fixture();
}

async function fixture() {
    const StaticQuoter = await deployKyberStaticQuoter()
    const OriginalQuoter = await getKyberQuoterV2()
    return { StaticQuoter, OriginalQuoter }
}

async function deployKyberStaticQuoter() {
    const [ deployer ] = await ethers.getSigners() 
    return deployContract(
        deployer, 
        "KyberStaticQuoter",
        [kyber.factory]
    );
}

async function getKyberQuoterV2() {
    return ethers.getContractAt(
        require("../../abis/KyberQuoterV2.json"),
        kyber.quoterV2
    );
}

describe("Quoter:Kyber", async () => {

    context("arbitrum", () => {

        async function checkStaticMatchesOriginalSingle(
            amountIn: BigNumber, 
            tokenIn: string, 
            tokenOut: string,
            fee: number
        ) {
            const params = {sqrtPriceLimitX96: 0, amountIn, tokenIn, tokenOut, fee}
            const dyOriginal = await getOriginalQuoterV2QuoteSingle(params);
            const dyStatic = await fix.StaticQuoter.quoteExactInputSingle(params);
            expect(dyStatic).to.eq(dyOriginal);
            logGasEstimateSingle(params)
        }

        async function checkStaticMatchesOriginalPath(
            amountIn: BigNumber, 
            tokens: string[],
            fees: number[]
        ) {
            const path = encodePath(tokens, fees);
            const dyOriginal = await getOriginalQuoterV2QuotePath(path, amountIn);
            const dyStatic = await fix.StaticQuoter.quoteExactInput(path, amountIn);
            expect(dyStatic).to.eq(dyOriginal);
        }

        async function getOriginalQuoterV2QuoteSingle(params: any) {
            const paramsOriginal = {
                limitSqrtP: params.sqrtPriceLimitX96,
                feeUnits: params.fee,
                amountIn: params.amountIn,
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
            }
            const res = await fix.OriginalQuoter.callStatic.quoteExactInputSingle(paramsOriginal);
            return res.returnedAmount;
        }

        async function getOriginalQuoterV2QuotePath(path: any, amountIn: BigNumber) {
            const res = await fix.OriginalQuoter.callStatic.quoteExactInput(path, amountIn);
            return res.amountOut;
        }

        async function logGasEstimateSingle(params: any) {
            const gas = await fix.StaticQuoter.estimateGas.quoteExactInputSingle(params)
            console.log(`Gas: ${gas.toString()}`)
        }

        let fix: ThenArgRecursive<ReturnType<typeof arbitrumFixture>>;

        context("93748184", async () => {
            const FORK_BLOCK = 93748184;

            beforeEach(async () => {
                fix = await arbitrumFixture(FORK_BLOCK); 
            });

            context("static-Quoter and original-Quoter quotes match :: single", async () => {

                it("USDT -> USDC (0.01%) :: 1000 USDT", async () => {
                    await checkStaticMatchesOriginalSingle(
                        ethers.utils.parseUnits("1000", 6),
                        tokens.usdc,
                        tokens.usdt,
                        10, // Kyber doesn't use bps
                    )
                })

                it("ARB -> USDC (2%) :: 10 ARB", async () => {
                    await checkStaticMatchesOriginalSingle(
                        ethers.utils.parseUnits("10", 18),
                        tokens.arb,
                        tokens.usdc,
                        2000, // Kyber doesn't use bps
                    )
                })

                it("USDC -> USDT (0.01%) :: 10_000 USDC", async () => {
                    await checkStaticMatchesOriginalSingle(
                        ethers.utils.parseUnits("10000", 6),
                        tokens.usdc,
                        tokens.usdt,
                        10, // Kyber doesn"t use bps
                    )

                })

                it("USDC -> ARB (2%) :: 333 USDC", async () => {
                    await checkStaticMatchesOriginalSingle(
                        ethers.utils.parseUnits("333", 6),
                        tokens.usdc,
                        tokens.arb,
                        2000, // Kyber doesn"t use bps
                    )
                })

            })


            context("static-Quoter and original-Quoter quotes match :: path", async () => {

                it("USDT -(0.01%)-> USDC -(2%)-> ARB -> :: 100 USDT", async () => {
                    await checkStaticMatchesOriginalPath(
                        ethers.utils.parseUnits("100", 6),
                        [tokens.usdt, tokens.usdc, tokens.arb],
                        [10, 2000], // Kyber doesn"t use bps
                    )
                })

            })

        });
    });

})