use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

#[derive(Debug)]
pub struct AppState {
    pub slot: AtomicU64,
    pub blockheight: AtomicU64,
}

pub fn mine_block(state: AppState) {
    state.slot = state.slot.into().fetch_add(1, Ordering::SeqCst);
    // state.blockheight += 1;
}
