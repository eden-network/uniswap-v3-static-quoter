import { BigNumber } from "ethers";
import { ethers, config } from "hardhat";
import { expect } from "chai";

import { ThenArgRecursive, deployContract, forkNetwork } from "./helpers";
import addresses from "./addresses.json";

const { tokens } = addresses.avalanche
const { kyber } = addresses.avalanche.protocols


async function avalancheFixture(blockNumber: number) {
    await forkNetwork('avalanche', blockNumber);
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
        'KyberStaticQuoter',
        [kyber.factory]
    );
}

async function getKyberQuoterV2() {
    return ethers.getContractAt(
        require('../abis/KyberQuoterV2.json'),
        kyber.quoterV2
    );
}

describe('Quoter:Kyber', async () => {

    context("avalanche", () => {

        context("19894491", async () => {
            const FORK_BLOCK = 19894491;

            let fix: ThenArgRecursive<ReturnType<typeof avalancheFixture>>;

            beforeEach(async () => {
                fix = await avalancheFixture(FORK_BLOCK); 
            });

            async function logGasEstimate(params: any) {
                const gas = await fix.StaticQuoter.estimateGas.quoteExactInputSingle(params)
                console.log(`Gas: ${gas.toString()}`)
            }

            context('static-Quoter and original-Quoter quotes match', async () => {

                async function checkStaticMatchesOriginal(
                    amountIn: BigNumber, 
                    tokenIn: string, 
                    tokenOut: string,
                    fee: number
                ) {
                    const params = {sqrtPriceLimitX96: 0, amountIn, tokenIn, tokenOut, fee}
                    const dyOriginal = await getOriginalQuoterV2Quote(params);
                    const dyStatic = await fix.StaticQuoter.quoteExactInputSingle(params);
                    expect(dyStatic).to.eq(dyOriginal);
                    logGasEstimate(params)
                }

                async function getOriginalQuoterV2Quote(params: any) {
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

                it("YUSD -> USDC (0.01%) :: 1000 YUSD", async () => {
                    await checkStaticMatchesOriginal(
                        ethers.utils.parseUnits('1000', 18),
                        tokens.yusd,
                        tokens.usdc,
                        10, // Kyber doesn't use bps
                    )
                })

                it("WAVAX -> SAVAX (0.01%) :: 1000 WAVAX", async () => {
                    await checkStaticMatchesOriginal(
                        ethers.utils.parseUnits('1000', 18),
                        tokens.wavax,
                        tokens.savax,
                        10, // Kyber doesn't use bps
                    )
                })

                it("YUSD -> SAVAX (0.04%) :: 333_333 YUSD", async () => {
                    await checkStaticMatchesOriginal(
                        ethers.utils.parseUnits('333333', 18),
                        tokens.yusd,
                        tokens.savax,
                        40, // Kyber doesn't use bps
                    )
                })

            })

        });
    });

})