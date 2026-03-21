import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { slot, blockHeight, accounts, latestBlockhash, incrementSlot, validBlockhashes, processedSignatures } from "./state"
import { executeSystemInstruction } from "./system-program";
import { executeTokenTransaction, executeATAInstruction } from "./token-program";


export const sendTransaction = (encodedTx: string) => {
    // Decode the base64-encoded transaction to a buffer
    const rawTx = Buffer.from(encodedTx, "base64");
    const tx: Transaction = Transaction.from(rawTx);

    // 1. Verify the BlockHash
    const blockhash = tx.recentBlockhash;
    if (!validBlockhashes.has(blockhash!)) {
        return { error: { code: -32003, message: "Invalid Blockhash" } };
    }

    // Verify all signatures using ed25519 — reject if any signature is invalid or missing (all zero).
    const verified = tx.verifySignatures(true);

    if (!verified) {
        return { error: { code: -32003, message: "Invalid Signature" } };
    }

    executeTransactions(tx.instructions);
    incrementSlot();
    return bs58.encode(nacl.randomBytes(64));
}

const executeTransactions = (instructions: TransactionInstruction[]) => {
    // Implement System, Token and ATA
    for (const instruction of instructions) {
        switch (instruction.programId.toBase58()) {
            // System Program 
            case "11111111111111111111111111111111":
                executeSystemInstruction(instruction);
                break;
            // Token Program
            case "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA":
                executeTokenTransaction(instruction);
                break;
            // Associated Token Account Program
            case "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL":
                executeATAInstruction(instruction);
                break;
            default:
                break;
        }
    }
}

