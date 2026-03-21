import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { slot, blockHeight, accounts, latestBlockhash, incrementSlot } from "./state"

export const getVersion = (): any => {
    return {
        "solana-core": "1.16.7",
        "feature-set": 4173822601
    }
}

// getHealth → "ok"
export const getHealth = (): string => {
    return "ok"
}


export const getSlot = (): number => {
    return slot;
}

export const getBlockHeight = (): number => {
    return blockHeight;
}

export const getLatestBlockhash = (): any => {
    return {
        context: { slot },
        value: {
            blockhash: latestBlockhash,
            lastValidBlockHeight: blockHeight + 150
        }
    }
}
