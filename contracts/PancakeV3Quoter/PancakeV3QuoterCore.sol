// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import "./PancakeV3likeQuoterCore.sol";
import "./lib/TickBitmap.sol";

contract PancakeV3QuoterCore is PancakeV3likeQuoterCore {
    function getPoolGlobalState(
        address pool
    ) internal view override returns (GlobalState memory gs) {
        gs.fee = uint16(IPancakeV3Pool(pool).fee());
        (gs.startPrice, gs.startTick, , , , , ) = IPancakeV3Pool(pool).slot0();
    }

    function getTickSpacing(
        address pool
    ) internal view override returns (int24) {
        return IPancakeV3Pool(pool).tickSpacing();
    }

    function getLiquidity(
        address pool
    ) internal view override returns (uint128) {
        return IPancakeV3Pool(pool).liquidity();
    }

    function nextInitializedTickWithinOneWord(
        address poolAddress,
        int24 tick,
        int24 tickSpacing,
        bool zeroForOne
    ) internal view override returns (int24 next, bool initialized) {
        return
            TickBitmap.nextInitializedTickWithinOneWord(
                poolAddress,
                tick,
                tickSpacing,
                zeroForOne
            );
    }

    function getTicks(
        address pool,
        int24 tick
    )
        internal
        view
        override
        returns (
            uint128 liquidityTotal,
            int128 liquidityDelta,
            uint256 outerFeeGrowth0Token,
            uint256 outerFeeGrowth1Token,
            int56 outerTickCumulative,
            uint160 outerSecondsPerLiquidity,
            uint32 outerSecondsSpent,
            bool initialized
        )
    {
        return IPancakeV3Pool(pool).ticks(tick);
    }
}
