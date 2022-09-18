import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";

import { 
    ThenArgRecursive, 
    deployContract, 
    forkNetwork
} from "./helpers";
import addresses from "./addresses.json";


const { tokens } = addresses.dogechain
const { quickswap } = addresses.dogechain.protocols

async function dogechainFixture(blockNumber: number) {
    await forkNetwork('dogechain', blockNumber);
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
        'AlgebraStaticQuoter',
        [quickswap.factory]
    );
}

async function getAlgebraQuoterV2() {
    return ethers.getContractAt(
        require('../abis/AlgebraQuoterV2.json'),
        quickswap.quoterV2
    );
}

describe('Quoter:Kyber', async () => {

    context("dogechain", () => {

        context("2280000", async () => {
            const FORK_BLOCK = 2280000;
            let fix: ThenArgRecursive<ReturnType<typeof dogechainFixture>>;

            beforeEach(async () => {
                fix = await dogechainFixture(FORK_BLOCK); 
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
                ) {
                    const params = {sqrtPriceLimitX96: 0, amountIn, tokenIn, tokenOut}
                    const dyOriginal = await getOriginalQuoterV2Quote(params);
                    const dyStatic = await fix.StaticQuoter.quoteExactInputSingle(params);
                    expect(dyStatic).to.eq(dyOriginal);
                    logGasEstimate(params);
                }

                async function getOriginalQuoterV2Quote(params: any) {
                    return fix.OriginalQuoter.callStatic.quoteExactInputSingle(
                        params.tokenIn,
                        params.tokenOut, 
                        params.amountIn, 
                        params.sqrtPriceLimitX96
                    );
                }

                it("WWDOGE -> USDC :: 1000 WWDOGE", async () => {
                    await checkStaticMatchesOriginal(
                        ethers.utils.parseUnits('1000', 18),
                        tokens.wwdoge,
                        tokens.usdc
                    )
                })

                it("USDC -> WWDOGE :: 33_000 USDC", async () => {
                    await checkStaticMatchesOriginal(
                        ethers.utils.parseUnits('33000', 6),
                        tokens.usdc,
                        tokens.wwdoge
                    )
                })

                it("USDC -> ETH :: 33_000 USDC", async () => {
                    await checkStaticMatchesOriginal(
                        ethers.utils.parseUnits('33000', 6),
                        tokens.usdc,
                        tokens.eth
                    )
                })

            })

        });
    });

})