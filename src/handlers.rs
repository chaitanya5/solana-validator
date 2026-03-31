use axum::{
    Json, Router,
    routing::{get, post},
};
use serde_json::{Value, json};
use std::sync::atomic::Ordering;
// mod types;
use crate::{
    state::{self, AppState, mine_block as mine_new_block},
    types::{AllowedMethods, Params, RpcError, RpcRequestObject, RpcResponseObject},
};
use solana_transaction:: {
    AccountMeta,
    Address,
    Transaction,
};

pub async fn get_version(id: Value) -> Json<RpcResponseObject> {
    let data = json!({
        "solana-core": "1.16.7",
        "feature-set": "4173822601"
    });

    return Json(RpcResponseObject {
        jsonrpc: String::from("2.0"),
        result: Some(data),
        error: None,
        id: id,
    });
}

pub async fn get_slot(id: Value, state: &AppState) -> Json<RpcResponseObject> {
    let slot = state.slot.load(Ordering::SeqCst);

    Json(RpcResponseObject {
        jsonrpc: String::from("2.0"),
        result: Some(json!(slot)),
        error: None,
        id,
    })
}

pub async fn mine_block(id: Value, state: &AppState) -> Json<RpcResponseObject> {
    let updated_state = mine_new_block(state);

    let data = json!({
        "slot": updated_state.slot.load(Ordering::SeqCst),
        "blockheight": updated_state.blockheight.load(Ordering::SeqCst),
    });

    Json(RpcResponseObject {
        jsonrpc: String::from("2.0"),
        result: Some(data),
        error: None,
        id,
    })
}

pub async fn send_transaction(
    id: Value,
    request_params: Option<Params>,
    state: &AppState,
) -> Json<RpcResponseObject> {
    match request_params {
        Some(parameters) => {
            if let Params::Array(params_list) = parameters {
                if let Some(Value::String(encoded_tx_string)) = params_list.first() {
                    // 1. Decode the base58-encoded transaction
                    let raw_tx_result = bs58::decode(encoded_tx_string).into_vec();
                    
                    let raw_tx = match raw_tx_result {
                        Ok(bytes) => bytes,
                        // Err(_) => error_response(id, -32602, "Invalid Base58 encoding"),
                        Err(_) => 
                        return Json(RpcResponseObject {
                            jsonrpc: "2.0".to_string(),
                            result: None,
                            error: Some(RpcError { code: -32602, message: "Invalid Base58 encoding".to_string() }),
                            id,
                        }),
                    };

                    // 2. Deserialize bytes into a Transaction object
                    // Note: Transaction::from typically expects bytes in Solana crates
                    let tx = Transaction::new_unsigned(raw_tx);

                    // 3. Verify the transaction against state (blockhash and signatures)
                    match verify_transaction(&tx, state).await {
                        Ok(_) => {
                            // Success: In a real app, you'd execute the instructions here
                            Json(RpcResponseObject {
                                jsonrpc: "2.0".to_string(),
                                result: Some(json!("Transaction verified successfully")),
                                error: None,
                                id,
                            })
                        }
                        Err(e) => error_response(id, -32002, format!("Transaction verification failed: {}", e).as_str())
                    }
                } else {
                    error_response(id, -32602, "Invalid Params")
                }
            } else {
                error_response(id, -32602, "Invalid Params")
            }
        }
        None => Json(RpcResponseObject {
            jsonrpc: String::from("2.0"),
            result: None,
            error: Some(RpcError {
                code: -32600,
                message: "Method not found".to_string(),
            }),
            id: id,
        }),
    }
}

fn error_response(id: Value, code: i64, message: &str) -> Json<RpcResponseObject> {
    Json(RpcResponseObject {
        jsonrpc: "2.0".to_string(),
        result: None,
        error: Some(RpcError { code: code, message: message.to_string() }),
        id,
    })
}

async fn verify_transaction(tx: &Transaction, state: &AppState) -> Result<(), String> {
    // 1. Verify the BlockHash
    // We check if the transaction's recent blockhash exists in our valid_block_hashes map
    let recent_hash = tx.message.recent_blockhash.to_string();
    let valid_hashes = state.valid_block_hashes.read().await;
    
    if !valid_hashes.contains_key(&recent_hash) {
        return Err("Blockhash not found or expired".to_string());
    }

    // 2. Verify signatures
    // This usually checks if the signatures match the message and the public keys
    // Transaction::verify usually performs this check in Solana crates
    tx.verify().map_err(|_| "Invalid signature found in transaction".to_string())
}
