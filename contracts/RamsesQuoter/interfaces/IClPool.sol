// SPDX-License-Identifier: MIT
pragma solidity >=0.7.5;

interface IClPool {
    function currentFee() external view returns (uint24);
}
