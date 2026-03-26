use serde_json::{Value, json};
use axum::{
    Json, Router,
    routing::{get, post},
};
// mod types;
use crate::types::{AllowedMethods, RpcRequestObject, RpcResponseObject};

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

pub async fn mine_block(id: Value) -> Json<RpcResponseObject> {
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

