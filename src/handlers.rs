use std::sync::atomic::Ordering;
use axum::{
    Json, Router,
    routing::{get, post},
};
use serde_json::{Value, json};
// mod types;
use crate::{
    state::{self, AppState, mine_block as mine_new_block},
    types::{AllowedMethods, RpcRequestObject, RpcResponseObject},
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
