import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";

import { 
    ThenArgRecursive, 
    deployContract,
    forkNetwork,
    encodePath,
} from "./helpers";
import addresses from "./addresses.json";

const { tokens } = addresses.avalanche
const { kyber } = addresses.avalanche.protocols


async function avalancheFixture(blockNumber: number) {
    await forkNetwork("avalanche", blockNumber);
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
        require("../abis/KyberQuoterV2.json"),
        kyber.quoterV2
    );
}

describe("Quoter:Kyber", async () => {

    context("avalanche", () => {

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

        let fix: ThenArgRecursive<ReturnType<typeof avalancheFixture>>;

        context("19894491", async () => {
            const FORK_BLOCK = 19894491;

            beforeEach(async () => {
                fix = await avalancheFixture(FORK_BLOCK); 
            });

            context("static-Quoter and original-Quoter quotes match :: single", async () => {

                it("YUSD -> USDC (0.01%) :: 1000 YUSD", async () => {
                    await checkStaticMatchesOriginalSingle(
                        ethers.utils.parseUnits("1000", 18),
                        tokens.yusd,
                        tokens.usdc,
                        10, // Kyber doesn"t use bps
                    )
                })

                it("WAVAX -> SAVAX (0.01%) :: 1000 WAVAX", async () => {
                    await checkStaticMatchesOriginalSingle(
                        ethers.utils.parseUnits("1000", 18),
                        tokens.wavax,
                        tokens.savax,
                        10, // Kyber doesn"t use bps
                    )
                })

                it("YUSD -> SAVAX (0.04%) :: 333_333 YUSD", async () => {
                    await checkStaticMatchesOriginalSingle(
                        ethers.utils.parseUnits("333333", 18),
                        tokens.yusd,
                        tokens.savax,
                        40, // Kyber doesn"t use bps
                    )

                })

                it("SAVAX -> YUSD (0.04%) :: 1000 SAVAX", async () => {
                    await checkStaticMatchesOriginalSingle(
                        ethers.utils.parseUnits("1000", 18),
                        tokens.savax,
                        tokens.yusd,
                        40, // Kyber doesn"t use bps
                    )
                })

            })


            context("static-Quoter and original-Quoter quotes match :: path", async () => {

                it("SAVAX -(0.04%)-> YUSD -(0.01%)-> USDC -> :: 100 SAVAX", async () => {
                    await checkStaticMatchesOriginalPath(
                        ethers.utils.parseUnits("100", 18),
                        [tokens.savax, tokens.yusd, tokens.usdc],
                        [40, 10], // Kyber doesn"t use bps
                    )
                })

            })

        });
    });

})