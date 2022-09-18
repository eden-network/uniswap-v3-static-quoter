// SPDX-License-Identifier: GPL-2.0-or-later
import { KyberFullMath as FullMath } from './KyberFullMath.sol';

/// @title Contains constants needed for math libraries
library MathConstants {
  uint256 internal constant TWO_FEE_UNITS = 200_000;
  uint256 internal constant TWO_POW_96 = 2**96;
  uint128 internal constant MIN_LIQUIDITY = 100000;
  uint8 internal constant RES_96 = 96;
  uint24 internal constant BPS = 10000;
  uint24 internal constant FEE_UNITS = 100000;
  // it is strictly less than 5% price movement if jumping MAX_TICK_DISTANCE ticks
  int24 internal constant MAX_TICK_DISTANCE = 480;
  // max number of tick travel when inserting if data changes
  uint256 internal constant MAX_TICK_TRAVEL = 10;
}

/// @title Contains helper function to calculate the number of reinvestment tokens to be minted
library ReinvestmentMath {
  /// @dev calculate the mint amount with given reinvestL, reinvestLLast, baseL and rTotalSupply
  /// contribution of lp to the increment is calculated by the proportion of baseL with reinvestL + baseL
  /// then rMintQty is calculated by mutiplying this with the liquidity per reinvestment token
  /// rMintQty = rTotalSupply * (reinvestL - reinvestLLast) / reinvestLLast * baseL / (baseL + reinvestL)
  function calcrMintQty(
    uint256 reinvestL,
    uint256 reinvestLLast,
    uint128 baseL,
    uint256 rTotalSupply
  ) internal pure returns (uint256 rMintQty) {
    uint256 lpContribution = FullMath.mulDivFloor(
      baseL,
      reinvestL - reinvestLLast,
      baseL + reinvestL
    );
    rMintQty = FullMath.mulDivFloor(rTotalSupply, lpContribution, reinvestLLast);
  }
}

/// @title Contains helper function to add or remove uint128 liquidityDelta to uint128 liquidity
library LiqDeltaMath {
  function applyLiquidityDelta(
    uint128 liquidity,
    uint128 liquidityDelta,
    bool isAddLiquidity
  ) internal pure returns (uint128) {
    return isAddLiquidity ? liquidity + liquidityDelta : liquidity - liquidityDelta;
  }
}