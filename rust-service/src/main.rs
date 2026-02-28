use std::net::SocketAddr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use axum::extract::State;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
struct AppState {
    requests_total: Arc<AtomicU64>,
}

#[derive(Deserialize)]
struct ModerateRequest {
    text: String,
}

#[derive(Serialize)]
struct ModerateResponse {
    score: f32,
    is_spam: bool,
    reasons: Vec<&'static str>,
}

#[derive(Serialize)]
struct HealthResponse {
    ok: bool,
}

#[derive(Serialize)]
struct StatsResponse {
    requests_total: u64,
}

#[tokio::main]
async fn main() {
    let state = AppState {
        requests_total: Arc::new(AtomicU64::new(0)),
    };

    let app = Router::new()
        .route("/health", get(health))
        .route("/moderate", post(moderate))
        .route("/stats", get(stats))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8081));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("Rust service running on http://{}", addr);
    axum::serve(listener, app).await.unwrap();
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    state.requests_total.fetch_add(1, Ordering::Relaxed);
    Json(HealthResponse { ok: true })
}

async fn stats(State(state): State<AppState>) -> Json<StatsResponse> {
    state.requests_total.fetch_add(1, Ordering::Relaxed);
    Json(StatsResponse {
        requests_total: state.requests_total.load(Ordering::Relaxed),
    })
}

async fn moderate(
    State(state): State<AppState>,
    Json(payload): Json<ModerateRequest>,
) -> Json<ModerateResponse> {
    state.requests_total.fetch_add(1, Ordering::Relaxed);

    let lower = payload.text.to_lowercase();
    let mut reasons: Vec<&'static str> = Vec::new();
    let mut score = 0.0_f32;

    let spam_markers = ["http://", "https://", "t.me/", "discord.gg", "casino", "crypto"];
    if spam_markers.iter().any(|marker| lower.contains(marker)) {
        score += 0.55;
        reasons.push("contains spam marker");
    }
    if payload.text.len() > 320 {
        score += 0.2;
        reasons.push("too long");
    }
    if payload.text.chars().filter(|c| *c == '!').count() >= 5 {
        score += 0.15;
        reasons.push("too many exclamation marks");
    }
    if payload.text.split_whitespace().count() <= 2 {
        score += 0.1;
        reasons.push("very short message");
    }

    let is_spam = score >= 0.6;
    Json(ModerateResponse {
        score: score.min(1.0),
        is_spam,
        reasons,
    })
}
