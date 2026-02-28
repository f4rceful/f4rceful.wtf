FROM rust:1.89-slim AS builder

WORKDIR /app
COPY Cargo.toml .
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim

WORKDIR /app
COPY --from=builder /app/target/release/rust-service /usr/local/bin/rust-service

EXPOSE 8081
CMD ["rust-service"]
