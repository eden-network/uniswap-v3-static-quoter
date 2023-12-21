// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

interface IClPoolFactory {
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address);
}
