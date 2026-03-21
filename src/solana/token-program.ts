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

    const signature = bs58.encode(nacl.randomBytes(64));
    processedSignatures.add(signature);

    return signature;
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

    const signature = bs58.encode(nacl.randomBytes(64));
    processedSignatures.add(signature);

    return signature;
}

const MintTo = (instruction: TransactionInstruction) => {
    // MintTo (discriminator 7): [u8 disc][u64 amount LE]
    // Accounts: [mint, destination, authority]

    const mintKey = instruction.keys[0];
    const destKey = instruction.keys[1];
    const authKey = instruction.keys[2];

    const mintAccount = accounts.get(mintKey.pubkey.toBase58());
    const destAccount = accounts.get(destKey.pubkey.toBase58());

    if (!mintAccount) throw new Error("Mint account not found");
    if (!destAccount) throw new Error("Destination account not found");

    // 1. Validate Mint State (offset 45)
    if (mintAccount.data.readUInt8(45) === 0) throw new Error("Mint not initialized");

    // 2. Validate Authority (Option at offset 0, Key at offset 4)
    const mintAuthOption = mintAccount.data.readUInt32LE(0);
    if (mintAuthOption === 0) throw new Error("Fixed supply mint");

    const mintAuthority = new PublicKey(mintAccount.data.subarray(4, 36));
    if (!mintAuthority.equals(authKey.pubkey)) throw new Error("Invalid mint authority");
    if (!authKey.isSigner) throw new Error("Authority must sign");

    // 3. Update Supply (offset 36) and Balance (offset 64)
    const amount = instruction.data.readBigUInt64LE(1);

    const currentSupply = mintAccount.data.readBigUInt64LE(36);
    mintAccount.data.writeBigUInt64LE(currentSupply + amount, 36);

    const currentBalance = destAccount.data.readBigUInt64LE(64);
    destAccount.data.writeBigUInt64LE(currentBalance + amount, 64);

    const signature = bs58.encode(nacl.randomBytes(64));
    processedSignatures.add(signature);

    return signature;

}

const Transfer = (instruction: TransactionInstruction) => {
    // Transfer (discriminator 3): [u8 disc][u64 amount LE]
    // Accounts: [source, destination, owner]

    // Input Extraction
    const sourceTokenKey = instruction.keys[0];
    const destTokenKey = instruction.keys[1];
    const ownerKey = instruction.keys[2];
    const amountToSend = instruction.data.readBigUInt64LE(1);

    if (!ownerKey.isSigner) throw new Error("Owner not signer");

    const sourceTokenAccount = accounts.get(sourceTokenKey.pubkey.toBase58());
    const destTokenAccount = accounts.get(destTokenKey.pubkey.toBase58());

    if (!sourceTokenAccount) throw new Error("Source account not found");
    if (!destTokenAccount) throw new Error("Destination account not found");

    // Validate Account State (initialized and correct size)
    if (sourceTokenAccount.data.length !== 165 || sourceTokenAccount.data[108] !== 1) throw new Error("Invalid source token account");
    if (destTokenAccount.data.length !== 165 || destTokenAccount.data[108] !== 1) throw new Error("Invalid destination token account");

    // Deconstruct the data of sourceTokenKey - mint, owner, amount
    const sourceTokenMint = new PublicKey(sourceTokenAccount.data.subarray(0, 32));
    const sourceTokenOwner = new PublicKey(sourceTokenAccount.data.subarray(32, 64));
    const sourceTokenBalance = sourceTokenAccount.data.readBigUInt64LE(64);

    const sourceTokenMintAccount = accounts.get(sourceTokenMint.toBase58());
    if (!sourceTokenMintAccount) throw new Error("Mint account not found");

    // 1. Peform SourceTokenAccount validations
    if (sourceTokenBalance < amountToSend) throw new Error("Insufficient Token Balance");

    // Verify Owner
    if (!sourceTokenOwner.equals(ownerKey.pubkey)) throw new Error("Owner mismatch");

    // Deconstruct the data of destTokenKey - mint, owner, amount
    const destTokenMint = new PublicKey(destTokenAccount.data.subarray(0, 32));
    const destTokenBalance = destTokenAccount.data.readBigUInt64LE(64);

    // 2. Peform destTokenAccount validations
    if (!destTokenMint.equals(sourceTokenMint)) throw new Error("Mint mismatch");

    // 3. Perform transfer
    sourceTokenAccount.data.writeBigUInt64LE(sourceTokenBalance - amountToSend, 64);
    destTokenAccount.data.writeBigUInt64LE(destTokenBalance + amountToSend, 64);

    const signature = bs58.encode(nacl.randomBytes(64));
    processedSignatures.add(signature);

    return signature;

}

const TransferChecked = (instruction: TransactionInstruction) => {
    // TransferChecked (discriminator 12): [u8 disc][u64 amount LE][u8 decimals]
    // Accounts: [source, mint, destination, owner]

    // Input Extraction
    const sourceTokenKey = instruction.keys[0];
    const mintKey = instruction.keys[1];
    const destTokenKey = instruction.keys[2];
    const ownerKey = instruction.keys[3];
    const amountToSend = instruction.data.readBigUInt64LE(1);
    const decimals = instruction.data.readUInt8(9);

    if (!ownerKey.isSigner) throw new Error("Owner not signer");

    const sourceTokenAccount = accounts.get(sourceTokenKey.pubkey.toBase58());
    const destTokenAccount = accounts.get(destTokenKey.pubkey.toBase58());

    if (!sourceTokenAccount) throw new Error("Source account not found");
    if (!destTokenAccount) throw new Error("Destination account not found");

    // Validate Account State (initialized and correct size)
    if (sourceTokenAccount.data.length !== 165 || sourceTokenAccount.data[108] !== 1) throw new Error("Invalid source token account");
    if (destTokenAccount.data.length !== 165 || destTokenAccount.data[108] !== 1) throw new Error("Invalid destination token account");

    // Deconstruct the data of sourceTokenKey - mint, owner, amount
    const sourceTokenMint = new PublicKey(sourceTokenAccount.data.subarray(0, 32));
    const sourceTokenOwner = new PublicKey(sourceTokenAccount.data.subarray(32, 64));
    const sourceTokenBalance = sourceTokenAccount.data.readBigUInt64LE(64);

    const sourceTokenMintAccount = accounts.get(sourceTokenMint.toBase58());
    if (!sourceTokenMintAccount) throw new Error("Mint account not found");

    const sourceTokenMintDecimals = sourceTokenMintAccount.data.readUInt8(44);

    // 1. Peform SourceTokenAccount validations
    if (sourceTokenBalance < amountToSend) throw new Error("Insufficient Token Balance");

    // Verify Owner
    if (!sourceTokenOwner.equals(ownerKey.pubkey)) throw new Error("Owner mismatch");

    // Deconstruct the data of destTokenKey - mint, owner, amount
    const destTokenMint = new PublicKey(destTokenAccount.data.subarray(0, 32));
    const destTokenBalance = destTokenAccount.data.readBigUInt64LE(64);
    const destTokenMintAccount = accounts.get(destTokenMint.toBase58());
    if (!destTokenMintAccount) throw new Error("Mint account not found");

    const destTokenMintDecimals = destTokenMintAccount.data.readUInt8(44);

    // 2. Peform destTokenAccount validations - mint
    if (!sourceTokenMint.equals(mintKey.pubkey) || !destTokenMint.equals(sourceTokenMint)) throw new Error("Mint mismatch");
    if (sourceTokenMintDecimals !== destTokenMintDecimals || sourceTokenMintDecimals !== decimals) throw new Error("Decimals mismatch");

    // 3. Perform transfer
    sourceTokenAccount.data.writeBigUInt64LE(sourceTokenBalance - amountToSend, 64);
    destTokenAccount.data.writeBigUInt64LE(destTokenBalance + amountToSend, 64);

    const signature = bs58.encode(nacl.randomBytes(64));
    processedSignatures.add(signature);

    return signature;

}

const Burn = (instruction: TransactionInstruction) => {
    // Burn (discriminator 8): [u8 disc][u64 amount LE]
    // Accounts: [tokenAccount, mint, owner]

    // Input Extraction
    const tokenAccountKey = instruction.keys[0];
    const mintKey = instruction.keys[1];
    const ownerKey = instruction.keys[2];
    const amountToBurn = instruction.data.readBigUInt64LE(1);

    if (!ownerKey.isSigner) throw new Error("Owner not signer");

    const tokenAccount = accounts.get(tokenAccountKey.pubkey.toBase58());
    const mintAccount = accounts.get(mintKey.pubkey.toBase58());

    if (!tokenAccount) throw new Error("Token account not found");
    if (!mintAccount) throw new Error("Mint account not found");

    if (tokenAccount.data.length !== 165 || tokenAccount.data[108] !== 1) throw new Error("Invalid token account");
    if (mintAccount.data.length !== 82 || mintAccount.data[45] !== 1) throw new Error("Invalid mint account");

    const tokenMint = new PublicKey(tokenAccount.data.subarray(0, 32));
    if (!tokenMint.equals(mintKey.pubkey)) throw new Error("Mint mismatch");

    const tokenOwner = new PublicKey(tokenAccount.data.subarray(32, 64));
    if (!tokenOwner.equals(ownerKey.pubkey)) throw new Error("Owner mismatch");

    const currentBalance = tokenAccount.data.readBigUInt64LE(64);
    if (currentBalance < amountToBurn) throw new Error("Insufficient Balance");

    const currentSupply = mintAccount.data.readBigUInt64LE(36);
    tokenAccount.data.writeBigUInt64LE(currentBalance - amountToBurn, 64);
    mintAccount.data.writeBigUInt64LE(currentSupply - amountToBurn, 36);

    const signature = bs58.encode(nacl.randomBytes(64));
    processedSignatures.add(signature);

    return signature;
}
const CloseAccount = (instruction: TransactionInstruction) => {
    // CloseAccount (discriminator 9): no additional data
    // Accounts: [account, destination, owner]

    // Input Extraction
    const accountKey = instruction.keys[0];
    const destinationKey = instruction.keys[1];
    const ownerKey = instruction.keys[2];

    if (!ownerKey.isSigner) throw new Error("Owner not signer");

    const account = accounts.get(accountKey.pubkey.toBase58());
    if (!account) throw new Error("Account not found");
    if (account.data.length !== 165 || account.data[108] !== 1) throw new Error("Invalid token account");

    const tokenOwner = new PublicKey(account.data.subarray(32, 64));
    if (!tokenOwner.equals(ownerKey.pubkey)) throw new Error("Owner mismatch");

    const tokenBalance = account.data.readBigUInt64LE(64);
    if (tokenBalance !== 0n) throw new Error("Non zero balance");

    let destAccount = accounts.get(destinationKey.pubkey.toBase58());
    if (!destAccount) {
        destAccount = {
            lamports: 0,
            owner: new PublicKey("11111111111111111111111111111111"), // System Program
            data: Buffer.alloc(0),
            executable: false,
            rentEpoch: 0
        };
        accounts.set(destinationKey.pubkey.toBase58(), destAccount);
    }

    destAccount.lamports += account.lamports;

    accounts.delete(accountKey.pubkey.toBase58());

    const signature = bs58.encode(nacl.randomBytes(64));
    processedSignatures.add(signature);

    return signature;

}

export const executeATAInstruction = (instruction: TransactionInstruction) => {
    //
}