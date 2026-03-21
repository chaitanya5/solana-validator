import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { slot, blockHeight, accounts, latestBlockhash, incrementSlot, validBlockhashes, processedSignatures } from "./state"


export const getTokenAccountBalance = (pubkey: string): any => {
    return {
    }
}



export const executeTokenTransaction = (instruction: TransactionInstruction) => {
    // Decode the instruction data(discriminator is u8)
    const discriminator = instruction.data.readUInt8(0);


    // Token Account Data Layout (165 bytes)
    // [32 bytes mint][32 bytes owner][8 bytes amount (u64 LE)][36 bytes delegate option][1 byte state][12 bytes isNative option][8 bytes delegatedAmount (u64 LE)][36 bytes closeAuthority option]

    // Mint Data Layout (82 bytes)
    // [4 bytes mintAuthorityOption (u32 LE)][32 bytes mintAuthority][8 bytes supply (u64 LE)][1 byte decimals][1 byte isInitialized][4 bytes freezeAuthorityOption (u32 LE)][32 bytes freezeAuthority]




    switch (discriminator) {
        case 20:
            InitializeMint2(instruction);   // InitializeMint2 (discriminator 20): [u8 disc][u8 decimals][32 bytes mintAuthority][u8 hasFreezeAuth][32 bytes freezeAuthority]
            break;
        case 18:
            InitializeAccount3(instruction);
            break;
        case 7:
            MintTo(instruction);
            break;
        case 3:
            Transfer(instruction);
            break;
        case 12:
            TransferChecked(instruction);
            break;
        case 8:
            Burn(instruction); 
            break;
    case 9:
            CloseAccount(instruction); 
            break;
        default:
            break;
    }
}



const InitializeMint2 = (instruction: TransactionInstruction) => {
    // InitializeMint2 (discriminator 20): [u8 disc][u8 decimals][32 bytes mintAuthority][u8 hasFreezeAuth][32 bytes freezeAuthority]
    // Accounts: [mint]
    
    const mintPubkey = instruction.keys[0].pubkey.toBase58();
    const mintAccount = accounts.get(mintPubkey);

    // Accounts: [mint]
    // Set mint data: decimals, mintAuthority, supply=0, isInitialized=1.
    // Fail if already initialized.
    if (!mintAccount) {
        throw new Error("Mint account not found");
    }

    if (mintAccount.data.length !== 82) {
        throw new Error("Invalid mint account size");
    }

    // Check isInitialized (offset 45)
    if (mintAccount.data[45] !== 0) {
        throw new Error("Mint already initialized");
    }

    // Parse Instruction Data
    const decimals = instruction.data.readUInt8(1);
    const mintAuthority = instruction.data.subarray(2, 34);
    const hasFreezeAuthority = instruction.data.readUInt8(34);
    const freezeAuthority = instruction.data.subarray(35, 67);

    // Write to Mint Account Data
    
    // Mint Authority Option (u32)
    mintAccount.data.writeUInt32LE(1, 0);
    
    // Mint Authority (32 bytes)
    mintAuthority.copy(mintAccount.data, 4);

    // Supply (u64) - initialized to 0
    mintAccount.data.writeBigUInt64LE(0n, 36);

    // Decimals (u8)
    mintAccount.data.writeUInt8(decimals, 44);

    // Is Initialized (u8)
    mintAccount.data.writeUInt8(1, 45);

    // Freeze Authority Option (u32)
    mintAccount.data.writeUInt32LE(hasFreezeAuthority ? 1 : 0, 46);

    // Freeze Authority (32 bytes)
    if (hasFreezeAuthority) {
        freezeAuthority.copy(mintAccount.data, 50);
    }
}

const InitializeAccount3 = (instruction: TransactionInstruction) => {
    // InitializeAccount3 (discriminator 18): [u8 disc][32 bytes owner]
    // Accounts: [tokenAccount, mint]
    
    const accountPubkey = instruction.keys[0].pubkey.toBase58();
    const mintPubkey = instruction.keys[1].pubkey.toBase58();

    const tokenAccount = accounts.get(accountPubkey);
    const mintAccount = accounts.get(mintPubkey);

    if (!tokenAccount) throw new Error("Token account not found");
    if (!mintAccount) throw new Error("Mint account not found");

    if (tokenAccount.data.length !== 165) throw new Error("Invalid token account size");
    
    // Check if already initialized (State is at offset 108. 0=Uninitialized, 1=Initialized)
    if (tokenAccount.data[108] !== 0) throw new Error("Token account already initialized");

    // Check if mint is initialized (IsInitialized at offset 45)
    if (mintAccount.data[45] === 0) throw new Error("Mint not initialized");

    const owner = new PublicKey(instruction.data.subarray(1, 33));

    // Write Token Account Data
    
    // Mint (32 bytes)
    new PublicKey(mintPubkey).toBuffer().copy(tokenAccount.data, 0);
    
    // Owner (32 bytes)
    owner.toBuffer().copy(tokenAccount.data, 32);
    
    // Amount (u64) = 0
    tokenAccount.data.writeBigUInt64LE(0n, 64);
    
    // Delegate Option (u32) = 0
    tokenAccount.data.writeUInt32LE(0, 72);
    
    // State (u8) = 1 (Initialized)
    tokenAccount.data.writeUInt8(1, 108);
    
    // IsNative Option (u32) = 0
    tokenAccount.data.writeUInt32LE(0, 109);
    
    // Delegated Amount (u64) = 0
    tokenAccount.data.writeBigUInt64LE(0n, 121);
    
    // Close Authority Option (u32) = 0
    tokenAccount.data.writeUInt32LE(0, 129);
}

const MintTo = (instruction: TransactionInstruction) => {}
const Transfer = (instruction: TransactionInstruction) => {}
const TransferChecked = (instruction: TransactionInstruction) => {}
const Burn = (instruction: TransactionInstruction) => {}
const CloseAccount = (instruction: TransactionInstruction) => {}

export const executeATAInstruction = (instruction: TransactionInstruction) => {
    //
}