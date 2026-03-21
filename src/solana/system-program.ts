import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { slot, blockHeight, accounts, latestBlockhash, incrementSlot, validBlockhashes, processedSignatures } from "./state"


export const requestAirdrop = (pubkeyBase58: string, lamports: number): string => {
    const account = accounts.get(pubkeyBase58);
    if (account) {
        account.lamports += lamports;
    } else {
        accounts.set(pubkeyBase58, {
            lamports,
            owner: new PublicKey("11111111111111111111111111111111"), // System Program
            data: Buffer.alloc(0),
            executable: false,
            rentEpoch: 0
        });
    }
    incrementSlot();
    const signature = bs58.encode(nacl.randomBytes(64));
    processedSignatures.add(signature);
    return signature;
}

export const executeSystemInstruction = (instruction: TransactionInstruction) => {
    // Decode the instruction data(discriminator is u32 little-endian)
    const discriminator = instruction.data.readUInt32LE(0);

    switch (discriminator) {
        case 0:
            createSystemAccount(instruction);   // createAccount (discriminator 0)
            break;
        case 2:
            solTransfer(instruction);   // Transfer (discriminator 2)
            break;

        default:
            break;
    }
}


export const createSystemAccount = (instruction: TransactionInstruction) => {
    // CreateAccount (discriminator 0): [u32 disc][u64 lamports][u64 space][32-byte owner pubkey]
    const payer = instruction.keys[0];
    const newAccount = instruction.keys[1];

    if (!payer.isSigner || !newAccount.isSigner) throw new Error("Signatures required");

    const lamports = Number(instruction.data.readBigUInt64LE(4));
    const space = Number(instruction.data.readBigUInt64LE(12));
    const owner = new PublicKey(instruction.data.subarray(20, 52));

    const payerAccount = accounts.get(payer.pubkey.toBase58());
    if (!payerAccount || payerAccount.lamports < lamports) throw new Error("Insufficient funds");

    const newAccountKey = newAccount.pubkey.toBase58();
    const existing = accounts.get(newAccountKey);
    if (existing && (existing.lamports > 0 || existing.data.length > 0)) throw new Error("Account exists");

    payerAccount.lamports -= lamports;
    accounts.set(newAccountKey, {
        lamports,
        owner,
        data: Buffer.alloc(space),
        executable: false,
        rentEpoch: 0
    });

    const signature = bs58.encode(nacl.randomBytes(64));
    processedSignatures.add(signature);

    return signature;
}

export const solTransfer = (instruction: TransactionInstruction) => {
    // Transfer (discriminator 2): [u32 disc][u64 lamports]
    const payer = instruction.keys[0];
    const receiver = instruction.keys[1];

    if (!payer.isSigner) throw new Error("Signatures required");

    const lamports = Number(instruction.data.readBigUInt64LE(4));

    const payerAccount = accounts.get(payer.pubkey.toBase58());
    const receiverAccount = accounts.get(receiver.pubkey.toBase58());

    if(!payerAccount || !accounts.get(payer.pubkey.toBase58())) throw new Error("Payer account not found");
    if(!receiverAccount || !accounts.get(receiver.pubkey.toBase58())) throw new Error("Receiver account not found");

    if(lamports > payerAccount.lamports) throw new Error("Insufficient funds");

    payerAccount.lamports -= lamports;
    receiverAccount.lamports += lamports;

    const signature = bs58.encode(nacl.randomBytes(64));
    processedSignatures.add(signature);

    return signature;   

}