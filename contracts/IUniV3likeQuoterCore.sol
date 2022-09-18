// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

struct GlobalState {
    uint160 startPrice;
    int24 startTick;
    uint16 fee;
    uint8 communityFeeToken0;
    uint8 communityFeeToken1;
}

struct SwapCache {
    // the protocol fee for the input token
    uint8 feeProtocol;
    // liquidity at the beginning of the swap
    uint128 liquidityStart;
    // the timestamp of the current block
    uint32 blockTimestamp;
    // the current value of the tick accumulator, computed only if we cross an initialized tick
    int56 tickCumulative;
    // the current value of seconds per liquidity accumulator, computed only if we cross an initialized tick
    uint160 secondsPerLiquidityCumulativeX128;
    // whether we've computed and cached the above two accumulators
    bool computedLatestObservation;
}

// the top level state of the swap, the results of which are recorded in storage at the end
struct SwapState {
    // the amount remaining to be swapped in/out of the input/output asset
    int256 amountSpecifiedRemaining;
    // the amount already swapped out/in of the output/input asset
    int256 amountCalculated;
    // current sqrt(price)
    uint160 sqrtPriceX96;
    // the tick associated with the current price
    int24 tick;
    // the global fee growth of the input token
    uint256 feeGrowthGlobalX128;
    // amount of input token paid as protocol fee
    uint128 protocolFee;
    // the current liquidity in range
    uint128 liquidity;
}

struct StepComputations {
    // the price at the beginning of the step
    uint160 sqrtPriceStartX96;
    // the next tick to swap to from the current tick in the swap direction
    int24 tickNext;
    // whether tickNext is initialized or not
    bool initialized;
    // sqrt(price) for the next tick (1/0)
    uint160 sqrtPriceNextX96;
    // how much is being swapped in in this step
    uint256 amountIn;
    // how much is being swapped out
    uint256 amountOut;
    // how much fee is being paid in
    uint256 feeAmount;
}

interface IUniV3likeQuoterCore {

    function quote(
        address poolAddress,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96
    ) external view returns (int256 amount0, int256 amount1);

}