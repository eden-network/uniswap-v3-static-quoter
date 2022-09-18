// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import '../UniV3likeQuoterCore.sol';
import './lib/TickBitmap.sol';

contract UniV3QuoterCore is UniV3likeQuoterCore {

    function getPoolGlobalState(
        address pool
    ) internal override view returns (GlobalState memory gs) {
        uint8 feeProtocol;
        gs.fee = uint16(IUniswapV3Pool(pool).fee());
        (gs.startPrice, gs.startTick,,,,feeProtocol,) = IUniswapV3Pool(pool).slot0();
        (gs.communityFeeToken0, gs.communityFeeToken1) = (feeProtocol%16, feeProtocol>>4);
    }
    
    function getTickSpacing(
        address pool
    ) internal override view returns (int24) {
        return IUniswapV3Pool(pool).tickSpacing();
    }
    
    function getLiquidity(address pool) internal override view returns (uint128) {
        return IUniswapV3Pool(pool).liquidity();
    }
    
    function feeGrowthGlobalX128(
        address pool, 
        bool zeroForOne
    ) internal override view returns (uint256) {
        return zeroForOne 
            ? IUniswapV3Pool(pool).feeGrowthGlobal0X128() 
            : IUniswapV3Pool(pool).feeGrowthGlobal1X128();
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
        return IUniswapV3Pool(pool).ticks(tick);
    }

}
