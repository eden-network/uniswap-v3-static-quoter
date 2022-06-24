import { ethers, config } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { encodePath, quoterV2, setHardhatNetwork, ThenArgRecursive } from "./helpers";
import { FeeAmount } from "@uniswap/v3-sdk";

async function fixture() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    const reference = quoterV2(deployer);

    const quoterFactory = await ethers.getContractFactory("UniswapV3StaticQuoter");
    const quoter = await quoterFactory.deploy(await reference.factory(), await reference.WETH9());

    return {
        deployer,
        quoter,
        reference
    };
}

async function ethereumFixture(blockNumber: number) {
    await setHardhatNetwork({
        rpcUrl: (config.networks as any).mainnet.url,
        forkBlockNumber: blockNumber,
        chainId: 1
    });

    return fixture();
}

describe("quoter", async () => {
    context("ethereum", () => {

        const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        const COMP = "0xc00e94Cb662C3520282E6f5717214004A7f26888";

        context("15013603", async () => {
            let fix: ThenArgRecursive<ReturnType<typeof ethereumFixture>>;

            beforeEach(async () => {
                fix = await ethereumFixture(15013603);
            });
            
            it("weth .3% usdc: 31337 eth", async () => {
                const amountIn = ethers.utils.parseEther("31337");
                const amountOut = BigNumber.from("31206401855667");
    
                const params = {
                    tokenIn: WETH,
                    tokenOut: USDC,
                    amountIn,
                    fee: FeeAmount.MEDIUM,
                    sqrtPriceLimitX96: 0
                };
    
                const referenceOut = await fix.reference.callStatic.quoteExactInputSingle(params);
                expect(referenceOut.amountOut).equals(amountOut);
    
                const quoterOut = await fix.quoter.quoteExactInputSingle(params);
                expect(quoterOut).equals(amountOut);
            });

            it("weth .3% usdc: 1 wei", async () => {
                const amountIn = 1;
                const amountOut = 0;
    
                const params = {
                    tokenIn: WETH,
                    tokenOut: USDC,
                    amountIn,
                    fee: FeeAmount.MEDIUM,
                    sqrtPriceLimitX96: 0
                };
    
                const referenceOut = await fix.reference.callStatic.quoteExactInputSingle(params);
                expect(referenceOut.amountOut).equals(amountOut);
    
                const quoterOut = await fix.quoter.quoteExactInputSingle(params);
                expect(quoterOut).equals(amountOut);
            });

            it("weth .3% usdc: max", async () => {
                const params = {
                    tokenIn: WETH,
                    tokenOut: USDC,
                    amountIn: ethers.constants.MaxUint256,
                    fee: FeeAmount.MEDIUM,
                    sqrtPriceLimitX96: 0
                };
    
                await expect(fix.reference.callStatic.quoteExactInputSingle(params)).reverted;
                await expect(fix.quoter.quoteExactInputSingle(params)).reverted;
            });

            it("invalid token", async () => {
                const params = {
                    tokenIn: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc3",
                    tokenOut: USDC,
                    amountIn: ethers.utils.parseEther("1337"),
                    fee: FeeAmount.MEDIUM,
                    sqrtPriceLimitX96: 0
                };

                await expect(fix.reference.callStatic.quoteExactInputSingle(params)).reverted;
                await expect(fix.quoter.quoteExactInputSingle(params)).reverted;
            });
        });

        context("15014353", async () => {
            let fix: ThenArgRecursive<ReturnType<typeof ethereumFixture>>;

            beforeEach(async () => {
                fix = await ethereumFixture(15014353);
            });

            it("usdc .05% weth .3% comp: 31337 usdc", async () => {
                const amountIn = ethers.utils.parseUnits("31337", 6);
                const amountOut = BigNumber.from("687578004838424621671");

                const path = encodePath([USDC, WETH, COMP], [FeeAmount.LOW, FeeAmount.MEDIUM]);

                const referenceOut = await fix.reference.callStatic.quoteExactInput(path, amountIn);
                expect(referenceOut.amountOut).equals(amountOut);
    
                const quoterOut = await fix.quoter.quoteExactInput(path, amountIn);
                expect(quoterOut).equals(amountOut);
            });
        });
    });
});
