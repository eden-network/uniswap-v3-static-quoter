// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import '@uniswap/v3-periphery/contracts/libraries/BytesLib.sol';

library PathNoFee {
    using BytesLib for bytes;

    uint256 constant ADDR_SIZE = 20;
    uint256 constant MULTIPLE_POOLS_MIN_LENGTH = 3*ADDR_SIZE;

    function decodeFirstPool(
        bytes memory path
    ) pure internal returns (address, address) {
        return (path.toAddress(0), path.toAddress(ADDR_SIZE));
    }

    function hasMultiplePools(
        bytes memory path
    ) internal pure returns (bool) {
        return path.length >= MULTIPLE_POOLS_MIN_LENGTH;
    }

    function skipToken(bytes memory path) internal pure returns (bytes memory) {
        return path.slice(ADDR_SIZE, path.length - ADDR_SIZE);
    }

}

