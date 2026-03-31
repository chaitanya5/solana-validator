use axum::{
    Json, Router,
    extract::State,
    routing::{get, post},
};
use bs58;
use rand::prelude::*;
use std::{
    collections::{HashMap, HashSet},
    str::FromStr,
    sync::{Arc, atomic::AtomicU64},
};
use tokio::sync::RwLock;

mod handlers;
mod state;
mod types;

use handlers::{create_account, get_slot, get_version, mine_block};
use state::AppState;
use types::{AllowedMethods, RpcError, RpcRequestObject, RpcResponseObject};

async fn health_check() -> &'static str {
    "OK"
}

async fn handler(
    State(state): State<Arc<AppState>>,
    Json(body): Json<RpcRequestObject>,
) -> Json<RpcResponseObject> {
    let RpcRequestObject {
        jsonrpc,
        method,
        params,
        id,
    } = body;

    if jsonrpc != "2.0" || method.is_empty() {
        return Json(RpcResponseObject {
            jsonrpc: String::from("2.0"),
            result: None,
            error: Some(RpcError {
                code: -32600,
                message: "Invalid Request".to_string(),
            }),
            id: id,
        });
    }

    match AllowedMethods::from_str(method.as_str()) {
        Ok(AllowedMethods::GetVersion) => {
            let response = get_version(id).await;
            response
        }
        Ok(AllowedMethods::GetSlot) => {
            let response = get_slot(id, &state).await;
            response
        }
        Ok(AllowedMethods::MineBlock) => {
            let response = mine_block(id, &state).await;
            response
        }
        Ok(AllowedMethods::SendTransaction) => {
            let response = send_transaction(id, params, &state).await;
            response
        }

        Err(_) => {
            return Json(RpcResponseObject {
                jsonrpc: String::from("2.0"),
                result: None,
                error: Some(RpcError {
                    code: -32600,
                    message: "Method not found".to_string(),
                }),
                id: id,
            });
        }
    }
}

#[tokio::main]
async fn main() {
    // Calculate initial blockhash first
    let mut rng = rand::rng();
    let random_bytes: [u8; 32] = rng.random();
    let random_hash = bs58::encode(random_bytes).into_string();

    let mut initial_block_hashes = HashMap::new();
    initial_block_hashes.insert(random_hash.clone(), 150);

    // Now initialize the state with the actual values
    let state = Arc::new(AppState {
        slot: AtomicU64::new(0),
        blockheight: AtomicU64::new(0),
        latest_block_hash: RwLock::new(random_hash),
        valid_block_hashes: RwLock::new(initial_block_hashes),
        accounts_memory: RwLock::new(HashMap::new()),
        processed_accounts: RwLock::new(HashSet::new()),
    });

    // You can chain multiple routes together using the builder pattern
    let app = Router::new()
        .route("/health_check", get(health_check))
        .route("/", post(handler))
        .with_state(Arc::clone(&state)); // Cloning the reference and not the data

    // Create a TCP listener
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("Failed to bind port 3000");

    println!("Server started successfully at 0.0.0.0:3000");
    axum::serve(listener, app)
        .await
        .expect("Failed to start server");
}
