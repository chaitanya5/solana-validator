use axum::{
    Json, Router,
    routing::{get, post},
};
use std::{str::FromStr, sync::{Arc, atomic::AtomicU64}};

mod handlers;
mod types;
mod state;

use handlers::get_version;
use types::{AllowedMethods, RpcRequestObject, RpcResponseObject};
use state::AppState;

use crate::types::RpcError;

async fn health_check() -> &'static str {
    "OK"
}

async fn handler(Json(body): Json<RpcRequestObject>) -> Json<RpcResponseObject> {
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
            let response = get_version(id).await;
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
    // Initialize the state wrapped in an Arc (Atomic Reference Counter)
    let state = Arc::new(AppState {
        slot: AtomicU64::new(0),
        blockheight: AtomicU64::new(0),
    });

    // You can chain multiple routes together using the builder pattern
    let app = Router::new()
        .route("/health_check", get(health_check))
        .route("/", post(handler))
        .with_state(state);

    // Create a TCP listener
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("Failed to bind port 3000");

    println!("Server started successfully at 0.0.0.0:3000");
    axum::serve(listener, app)
        .await
        .expect("Failed to start server");
}
