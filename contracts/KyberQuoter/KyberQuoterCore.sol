// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import '@uniswap/v3-periphery/contracts/base/PeripheryImmutableState.sol';
import '@uniswap/v3-periphery/contracts/libraries/Path.sol';
import '@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol';

import { 
    MathConstants as C, 
    ReinvestmentMath, 
    FullMath as FM,
    LiqDeltaMath
} from "./lib/KyberMath.sol";
import { IKyberPool } from "./interfaces/IKyberPool.sol";


import "./interfaces/IKyberFactory.sol";
import './lib/TickBitmapKyber.sol';

// temporary swap variables, some of which will be used to update the pool state
struct SwapData {
    int256 specifiedAmount; // the specified amount (could be tokenIn or tokenOut)
    int256 returnedAmount; // the opposite amout of sourceQty
    uint160 sqrtP; // current sqrt(price), multiplied by 2^96
    int24 currentTick; // the tick associated with the current price
    int24 nextTick; // the next initialized tick
    uint160 nextSqrtP; // the price of nextTick
    bool isToken0; // true if specifiedAmount is in token0, false if in token1
    bool isExactInput; // true = input qty, false = output qty
    uint128 baseL; // the cached base pool liquidity without reinvestment liquidity
    uint128 reinvestL; // the cached reinvestment liquidity
    uint128 reinvestLLast;
    address factory;
}

// variables below are loaded only when crossing a tick
struct SwapCache {
    uint256 rTotalSupply; // cache of total reinvestment token supply
    uint128 reinvestLLast; // collected liquidity
    uint256 feeGrowthGlobal; // cache of fee growth of the reinvestment token, multiplied by 2^96
    uint128 secondsPerLiquidityGlobal; // all-time seconds per liquidity, multiplied by 2^96
    address feeTo; // recipient of govt fees
    uint24 governmentFeeUnits; // governmentFeeUnits to be charged
    uint256 governmentFee; // qty of reinvestment token for government fee
    uint256 lpFee; // qty of reinvestment token for liquidity provider
}




// todo: add fn to swap all amountIn or nothing (use default val for sqrtPriceLimitX96)

contract KyberQuoterCore {
    using LowGasSafeMath for uint256;
    using LowGasSafeMath for int256;
    using SafeCast for uint256;
    using SafeCast for int256;
    using Path for bytes;

    function quote(
        address poolAddress,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96
    ) public view returns (int256 amount0, int256 amount1) {
        require(amountSpecified != 0, '0 swapQty');
        SwapData memory swapData;
        swapData.factory = IKyberPool(poolAddress).factory();
        swapData.specifiedAmount = amountSpecified;
        swapData.isToken0 = zeroForOne;
        swapData.isExactInput = swapData.specifiedAmount > 0;
        // tick (token1Qty/token0Qty) will increase for swapping from token1 to token0
        bool willUpTick = (swapData.isExactInput != zeroForOne);
        (
            swapData.baseL,
            swapData.reinvestL,
            swapData.reinvestLLast,
            swapData.sqrtP,
            swapData.currentTick,
            swapData.nextTick
        ) = _getInitialSwapData(poolAddress, willUpTick);
        // verify limitSqrtP
        if (willUpTick) {
            require(
                sqrtPriceLimitX96 > swapData.sqrtP && sqrtPriceLimitX96 < TickMath.MAX_SQRT_RATIO,
                'bad limitSqrtP'
            );
        } else {
            require(
                sqrtPriceLimitX96 < swapData.sqrtP && sqrtPriceLimitX96 > TickMath.MIN_SQRT_RATIO,
                'bad limitSqrtP'
            );
        }
        uint24 swapFeeUnits = IKyberPool(poolAddress).swapFeeUnits();
        SwapCache memory cache;
        // continue swapping while specified input/output isn't satisfied or price limit not reached
        while (swapData.specifiedAmount != 0 && swapData.sqrtP != sqrtPriceLimitX96) {
            // math calculations work with the assumption that the price diff is capped to 5%
            // since tick distance is uncapped between currentTick and nextTick
            // we use tempNextTick to satisfy our assumption with MAX_TICK_DISTANCE is set to be matched this condition
            int24 tempNextTick = swapData.nextTick;
            if (willUpTick && tempNextTick > C.MAX_TICK_DISTANCE + swapData.currentTick) {
                tempNextTick = swapData.currentTick + C.MAX_TICK_DISTANCE;
            } else if (!willUpTick && tempNextTick < swapData.currentTick - C.MAX_TICK_DISTANCE) {
                tempNextTick = swapData.currentTick - C.MAX_TICK_DISTANCE;
            }

            swapData.nextSqrtP = TickMath.getSqrtRatioAtTick(tempNextTick);

            // local scope for targetSqrtP, usedAmount, returnedAmount and deltaL
            {
                uint160 targetSqrtP = swapData.nextSqrtP;
                // ensure next sqrtP (and its corresponding tick) does not exceed price limit
                if (willUpTick == (swapData.nextSqrtP > sqrtPriceLimitX96)) {
                targetSqrtP = sqrtPriceLimitX96;
                }

                int256 usedAmount;
                int256 returnedAmount;
                uint256 deltaL;
                (usedAmount, returnedAmount, deltaL, swapData.sqrtP) = SwapMath.computeSwapStep(
                    swapData.baseL + swapData.reinvestL,
                    swapData.sqrtP,
                    targetSqrtP,
                    swapFeeUnits,
                    swapData.specifiedAmount,
                    swapData.isExactInput,
                    swapData.isToken0
                );

                swapData.specifiedAmount -= usedAmount;
                swapData.returnedAmount += returnedAmount;
                swapData.reinvestL += toUint128(deltaL);
            }

      // if price has not reached the next sqrt price
      if (swapData.sqrtP != swapData.nextSqrtP) {
        swapData.currentTick = TickMath.getTickAtSqrtRatio(swapData.sqrtP);
        break;
      }
      swapData.currentTick = willUpTick ? tempNextTick : tempNextTick - 1;
      // if tempNextTick is not next initialized tick
      if (tempNextTick != swapData.nextTick) continue;

      if (cache.rTotalSupply == 0) {
        // load variables that are only initialized when crossing a tick
        cache.rTotalSupply = IKyberPool(poolAddress).totalSupply();
        cache.reinvestLLast = swapData.reinvestLLast;
        cache.feeGrowthGlobal = IKyberPool(poolAddress).getFeeGrowthGlobal();
        // todo: could below be moved out of the loop?
        cache.secondsPerLiquidityGlobal = _syncSecondsPerLiquidity(
            poolAddress,
            swapData.baseL
        );
        (cache.feeTo, cache.governmentFeeUnits) = IKyberFactory(swapData.factory).feeConfiguration();
      }
      // update rTotalSupply, feeGrowthGlobal and reinvestL
      uint256 rMintQty = ReinvestmentMath.calcrMintQty(
        swapData.reinvestL,
        cache.reinvestLLast,
        swapData.baseL,
        cache.rTotalSupply
      );
      if (rMintQty != 0) {
        cache.rTotalSupply += rMintQty;
        // overflow/underflow not possible bc governmentFeeUnits < 20000
          uint256 governmentFee = (rMintQty * cache.governmentFeeUnits) / C.FEE_UNITS;
          cache.governmentFee += governmentFee;

          uint256 lpFee = rMintQty - governmentFee;
          cache.lpFee += lpFee;

          cache.feeGrowthGlobal += FM.mulDivFloor(lpFee, C.TWO_POW_96, swapData.baseL);
      }
      cache.reinvestLLast = swapData.reinvestL;

      (swapData.baseL, swapData.nextTick) = _updateLiquidityAndCrossTick(
        poolAddress,
        swapData.nextTick,
        swapData.baseL,
        cache.feeGrowthGlobal,
        cache.secondsPerLiquidityGlobal,
        willUpTick
      );
    }

    (amount0, amount1) = zeroForOne
      ? (amountSpecified - swapData.specifiedAmount, swapData.returnedAmount)
      : (swapData.returnedAmount, amountSpecified - swapData.specifiedAmount);

    }

    /// @dev Returns the block timestamp truncated to 32 bits, i.e. mod 2**32. This method is overridden in tests.
    function _blockTimestamp() internal view returns (uint32) {
        return uint32(block.timestamp); // truncation is desired
    }

    function _getInitialSwapData(
        address poolAddress,
        bool willUpTick
    ) internal view returns (
        uint128 baseL,
        uint128 reinvestL,
        uint128 reinvestLLast,
        uint160 sqrtP,
        int24 currentTick,
        int24 nextTick_
    ) {
        int24 nearestCurrentTick;
        (sqrtP, currentTick, nearestCurrentTick,) = IKyberPool(poolAddress).getPoolState();
        (baseL, reinvestL, reinvestLLast) = IKyberPool(poolAddress).getLiquidityState();
        nextTick_ = willUpTick
            ? getNextInitializedTick(poolAddress, nextTick_)
            : nearestCurrentTick;
    }

    function getSecondsPerLiquidityGlobal(
        address poolAddress
    ) internal view returns (uint secondsPerLiquidityGlobal) {
        (secondsPerLiquidityGlobal,) = IKyberPool(poolAddress).getSecondsPerLiquidityData();
    }

    /// @dev sync the value of secondsPerLiquidity data to current block.timestamp
    /// @return new value of _secondsPerLiquidityGlobal
    function _syncSecondsPerLiquidity(
        address poolAddress,
        uint128 baseL
    ) internal view returns (uint128) {
        (uint128 secondsPerLiquidityGlobal, uint32 lastUpdateTime) = IKyberPool(poolAddress).getSecondsPerLiquidityData();
        uint256 secondsElapsed = _blockTimestamp() - lastUpdateTime;
        // update secondsPerLiquidityGlobal and secondsPerLiquidityUpdateTime if needed
        if (secondsElapsed > 0 && baseL > 0) {
            secondsPerLiquidityGlobal += uint128((secondsElapsed << C.RES_96) / baseL);
        }
        return secondsPerLiquidityGlobal;
    }

    /// @dev Update liquidity net data and do cross tick
    function _updateLiquidityAndCrossTick(
        address poolAddress,
        int24 nextTick,
        uint128 currentLiquidity,
        uint256 feeGrowthGlobal,
        uint128 secondsPerLiquidityGlobal,
        bool willUpTick
    ) internal view returns (uint128 newLiquidity, int24 newNextTick) {
        (,int128 liquidityNet,,) = IKyberPool(poolAddress).ticks(nextTick);
        if (willUpTick) {
            (,newNextTick) = IKyberPool(poolAddress).initializedTicks(nextTick);
        } else {
            (newNextTick,) = IKyberPool(poolAddress).initializedTicks(nextTick);
            liquidityNet = -liquidityNet;
        }
        newLiquidity = LiqDeltaMath.applyLiquidityDelta(
            currentLiquidity,
            liquidityNet >= 0 ? uint128(liquidityNet) : revToUint128(liquidityNet),
            liquidityNet >= 0
        );
    }

      /// @notice Cast a uint256 to a uint128, revert on overflow
  /// @param y the uint256 to be downcasted
  /// @return z The downcasted integer, now type uint128
  function toUint128(uint256 y) internal pure returns (uint128 z) {
    require((z = uint128(y)) == y);
  }

  function getNextInitializedTick(address poolAddress, int24 tick) internal view returns (int24 next) {
    (,next) = IKyberPool(poolAddress).initializedTicks(tick);
  }

    /// @notice Cast a int128 to a uint128 and reverses the sign.
  /// @param y The int128 to be casted
  /// @return z = -y, now type uint128
  function revToUint128(int128 y) internal pure returns (uint128 z) {
      return type(uint128).max - uint128(y) + 1;
  }

}
