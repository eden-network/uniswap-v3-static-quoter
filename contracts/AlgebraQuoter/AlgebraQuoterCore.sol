// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import './interfaces/IAlgebraPool.sol';
import './lib/TickBitmapAlgebra.sol';
import '../UniV3likeQuoterCore.sol';

contract AlgebraQuoterCore is UniV3likeQuoterCore { 

    function getPoolGlobalState(address pool) internal override view returns (GlobalState memory gs) {
        (gs.startPrice, gs.startTick, gs.fee,,,,) = IAlgebraPool(pool).globalState();
    }

    function getTickSpacing(
        address pool
    ) internal override view returns (int24) {
        return IAlgebraPool(pool).tickSpacing();
    }
    
    function getLiquidity(address pool) internal override view returns (uint128) {
        return IAlgebraPool(pool).liquidity();
    }
    
    function nextInitializedTickWithinOneWord(
        address poolAddress,
        int24 tick,
        int24 tickSpacing,
        bool zeroForOne
    ) internal override view returns (int24 next, bool initialized) {
        return TickBitmap.nextInitializedTickWithinOneWord(
            poolAddress,
            tick,
            tickSpacing,
            zeroForOne
        );
    }
    
    function getTicks(address pool, int24 tick) internal override view returns (
        uint128 liquidityTotal,
        int128 liquidityDelta,
        uint256 outerFeeGrowth0Token,
        uint256 outerFeeGrowth1Token,
        int56 outerTickCumulative,
        uint160 outerSecondsPerLiquidity,
        uint32 outerSecondsSpent,
        bool initialized
    ) {
        return IAlgebraPool(pool).ticks(tick);
    }

}
