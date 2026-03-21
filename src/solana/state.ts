import { PublicKey, AccountInfo } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

export let slot: number = 0;
export let blockHeight: number = 0;
export const accounts = new Map<string, AccountInfo<Buffer>>();
export const processedSignatures = new Set<string>();
export let latestBlockhash = bs58.encode(nacl.randomBytes(32));
export const validBlockhashes = new Map<string, number>();
validBlockhashes.set(latestBlockhash, 150);


export const incrementSlot = () => {
    slot++;
    blockHeight++;
    latestBlockhash = bs58.encode(nacl.randomBytes(32));
    validBlockhashes.set(latestBlockhash, blockHeight + 150);
};