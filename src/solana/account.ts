import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { slot, blockHeight, accounts, latestBlockhash, incrementSlot } from "./state"

export const getAccountInfo = (pubkeyBase58: string): any => {
    let info = accounts.get(pubkeyBase58);

    if (!info) {
        return { context: { slot }, value: null }
    }
    return {
        context: { slot },
        value: {
            executable: info.executable,
            lamports: info.lamports,
            owner: info.owner.toBase58(),
            rentEpoch: info.rentEpoch,
            data: {}
        }
    }
}

export const getBalance = (pubkeyBase58: string): any => {
    const account = accounts.get(pubkeyBase58);
    return {
        context: { slot },
        value: account ? account.lamports : 0
    }
}

export const getMinimumBalanceForRentExemption = (dataSize: number): number => {
    return (dataSize + 128) * 2;
}