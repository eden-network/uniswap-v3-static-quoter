import { ethers, network } from 'hardhat';
import { abi as QUOTERV2_ABI } from "@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json";
import { Signer } from 'ethers';
import { FeeAmount } from "@uniswap/v3-sdk";

export const setHardhatNetwork = async (
    { forkBlockNumber, chainId, rpcUrl }:
        { forkBlockNumber: number, chainId: number, rpcUrl: string }
) => {
    return network.provider.request({
        method: "hardhat_reset",
        params: [
            {
                chainId: chainId,
                forking: {
                    blockNumber: forkBlockNumber,
                    jsonRpcUrl: rpcUrl,
                },
            },
        ],
    });
}

export type ThenArgRecursive<T> = T extends PromiseLike<infer U>
    ? ThenArgRecursive<U>
    : T;

export function quoterV2(signer: Signer) {
    return new ethers.Contract(
        "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
        QUOTERV2_ABI,
        signer
    );
}

export function encodePath(path: string[], fees: FeeAmount[]): string {
    const ADDR_SIZE = 20;
    const FEE_SIZE = 3;
    const OFFSET = ADDR_SIZE + FEE_SIZE;
    const DATA_SIZE = OFFSET + ADDR_SIZE;

    if (path.length != fees.length + 1) {
      throw new Error('path/fee lengths do not match')
    }
  
    let encoded = '0x'
    for (let i = 0; i < fees.length; i++) {
      // 20 byte encoding of the address
      encoded += path[i].slice(2)
      // 3 byte encoding of the fee
      encoded += fees[i].toString(16).padStart(2 * FEE_SIZE, '0')
    }
    // encode the final token
    encoded += path[path.length - 1].slice(2)
  
    return encoded.toLowerCase()
  }