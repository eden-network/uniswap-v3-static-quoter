import { ethers, network, config } from 'hardhat';
import { BigNumber, Signer, VoidSigner } from 'ethers';
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

export async function forkNetwork(networkName: string, blockNumber: number) {
    const networkConfig = config.networks[networkName];
    await setHardhatNetwork({
        rpcUrl: (networkConfig as any).url,
        forkBlockNumber: blockNumber,
        chainId: (networkConfig as any).chainId,
    })
}

export async function deployContract(
    deployer: Signer, 
    contract: string, 
    args?: any[]
) {
    return ethers.getContractFactory(contract)
        .then(f => f.connect(deployer).deploy(...(args || [])))
}

export function encodePath(path: string[], fees: FeeAmount[]): string {
    const FEE_SIZE = 3;

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

export function encodePathNoFees(path: string[]): string {
    let encoded = '0x'
    for (let i = 0; i < (path.length-1); i++) {
      // 20 byte encoding of the address
      encoded += path[i].slice(2)
    }
    // encode the final token
    encoded += path[path.length - 1].slice(2)
  
    return encoded.toLowerCase()
}