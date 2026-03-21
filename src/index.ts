import express from "express";
import { Request } from "./types";
import { 
    getHealth,
    getBlockHeight,
    getSlot,
    getLatestBlockhash,
    requestAirdrop,
    getAccountInfo,
    getBalance,
    getVersion,
    getMinimumBalanceForRentExemption,
    getTokenAccountBalance,
    sendTransaction,
 } from "./solana";


const app = express();
app.use(express.json());

// TODO: Implement your mini Solana validator here
// Handle JSON-RPC 2.0 requests at POST /


// 1. Define your local methods
const methods: Record<string, any> = {

    // Cluster Info
    getVersion: () => getVersion(),
    getSlot: () => getSlot(),
    getBlockHeight: () => getBlockHeight(),
    getHealth: () => getHealth(),

    // Blockhash
    getLatestBlockhash: () => getLatestBlockhash(),
    
    // Account Queries
    getBalance: ([pubkey]: [string]) => getBalance(pubkey),
    getAccountInfo: ([pubkey]: [string]) => getAccountInfo(pubkey),
    getMinimumBalanceForRentExemption: ([dataSize]: [number]) => getMinimumBalanceForRentExemption(dataSize),
    
    // Token Queries
    // getTokenAccountBalance: ([pubkey]: [string]) => getTokenAccountBalance(pubkey),
    // Transaction Submission
    requestAirdrop: ([pubkey, lamports]: [string, number]) => requestAirdrop(pubkey, lamports),
    sendTransaction: ([encodedTx]: [string, any?]) => {
        const result = sendTransaction(encodedTx);
        if (typeof result === "object" && result.error) {
            throw result.error;
        }
        return result;
    },
};

// 2. Logic to process a single request object
const processRequest = (req: Request) => {
    const { jsonrpc, method, params, id } = req;

    // Validation
    if (jsonrpc !== "2.0" || !method) {
        return { jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id: id || null };
    }

    if (!methods[method]) {
        return { jsonrpc: "2.0", error: { code: -32601, message: "Method not found" }, id };
    }

    try {
        const result = methods[method](params);
        // If no ID is present, it's a notification (return nothing)
        return id === undefined ? null : { jsonrpc: "2.0", result, id };
    } catch (err: any) {
        if (err.code) {
            return { jsonrpc: "2.0", error: err, id };
        }
        return { jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id };
    }
};

// 3. The main RPC Endpoint
app.post('/', (req, res) => {
    const body = req.body;

    if (Array.isArray(body)) {
        // Handle Batch Request
        const responses = body.map(processRequest).filter(res => res !== null);
        return res.send(responses.length > 0 ? responses : undefined);
    } else {
        // Handle Single Request
        const response = processRequest(body);
        return response ? res.send(response) : res.status(204).send();
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Mini Solana Validator running on port ${PORT}`);
});