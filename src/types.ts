export interface Request {
    jsonrpc: string;
    method: string;
    params?: any;
    id: number;
}

export interface Account {
    pubkey: string;
    lamports: number;
    owner: string;
    data: string;
    executable: boolean;
}









import { PublicKey, AccountInfo } from "@solana/web3.js";
