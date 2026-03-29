use std::sync::{
    Arc,
    atomic::{AtomicU64, Ordering},
};
use std::collections::{HashMap, HashSet};
use tokio::sync::RwLock;

use solana_system_interface::{
    instruction,
};
use solana_account::{
    Account
};

#[derive(Debug)]
pub struct AppState {
    pub slot: AtomicU64,
    pub blockheight: AtomicU64,
    pub latest_block_hash: RwLock<String>,
    pub valid_block_hashes: RwLock<HashMap<String, u64>>,
    pub accounts_memory: RwLock<HashMap<String, Account>>,
    pub processed_accounts: RwLock<HashSet<String>>
}



pub fn mine_block(state: &AppState) -> &AppState {
    state.slot.fetch_add(1, Ordering::SeqCst);
    state.blockheight.fetch_add(1, Ordering::SeqCst);

    state
}
