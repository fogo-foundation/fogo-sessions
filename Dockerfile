# Stage 1: Build the BPF programs
FROM rust:1.87.0 AS bpf-builder
WORKDIR /workspace

RUN apt-get update && apt-get install -y \
    curl xz-utils pkg-config libssl-dev build-essential git clang llvm make

RUN curl -sL https://github.com/anza-xyz/agave/releases/download/v2.2.20/solana-release-x86_64-unknown-linux-gnu.tar.bz2 \
    | tar -xj -C /usr/local
ENV PATH="/usr/local/solana-release/bin:${PATH}"

COPY programs/chain-id ./programs/chain-id
COPY programs/domain-registry ./programs/domain-registry
COPY programs/intent-transfer ./programs/intent-transfer
COPY programs/session-manager ./programs/session-manager

COPY packages/sessions-sdk-rs ./packages/sessions-sdk-rs
COPY packages/sessions-localnet ./packages/sessions-localnet
COPY packages/solana-intents ./packages/solana-intents

COPY services/paymaster ./services/paymaster

COPY tilt/programs/spl_associated_token_account.so spl_associated_token_account.so
COPY tilt/programs/spl_token.so spl_token.so

COPY Cargo.toml Cargo.lock ./

RUN cargo-build-sbf --manifest-path ./Cargo.toml



# Stage 2: Build the Rust binaries
FROM rust:1.87.0 AS build
WORKDIR /workspace

COPY Cargo.toml Cargo.lock ./
COPY programs ./programs
COPY services/paymaster ./services/paymaster
COPY packages/sessions-sdk-rs ./packages/sessions-sdk-rs
COPY packages/sessions-localnet ./packages/sessions-localnet
COPY packages/solana-intents ./packages/solana-intents

RUN cargo build -p fogo-paymaster --release --locked && \
    cargo build -p sessions-localnet --release --locked




# # Stage repl
# FROM anzaxyz/agave:v2.2.20 AS runtime
# WORKDIR /app

# COPY --from=bpf-builder /workspace/target/sbpf-solana-solana/release/session_manager.so ./session_manager.so
# COPY --from=bpf-builder /workspace/target/sbpf-solana-solana/release/chain_id.so ./chain_id.so
# COPY --from=bpf-builder /workspace/target/sbpf-solana-solana/release/domain_registry.so ./domain_registry.so
# COPY --from=bpf-builder /workspace/target/sbpf-solana-solana/release/intent_transfer.so ./intent_transfer.so
# COPY --from=bpf-builder /workspace/spl_associated_token_account.so ./spl_associated_token_account.so
# COPY --from=bpf-builder /workspace/spl_token.so ./spl_token.so

# # Copy Rust binaries
# COPY --from=build /workspace/target/release/fogo-paymaster /usr/local/bin/fogo-paymaster
# COPY --from=build /workspace/target/release/sessions-localnet /usr/local/bin/sessions-localnet

# # Ensure binaries are executable
# RUN chmod +x /usr/local/bin/fogo-paymaster /usr/local/bin/sessions-localnet

# # Expose RPC / HTTP ports
# EXPOSE 8899 4000

# # Entrypoint
# ENTRYPOINT ["/usr/local/bin/sessions-localnet"]


# Stage 3: Build solana-test-validator from Agave
FROM rust:1.87.0 AS agave-builder
WORKDIR /agave
ENV OPENSSL_NO_ASM=1
ENV OPENSSL_NO_BUILTIN=1
RUN apt-get update && apt-get install -y pkg-config libssl-dev build-essential clang llvm git cmake curl
RUN git clone --branch v2.2.20 --depth 1 https://github.com/anza-xyz/agave.git . 
RUN cargo build --release --bin solana-test-validator

# Stage 4: Create the runtime image
FROM debian:bookworm-slim AS runtime
WORKDIR /app

COPY --from=agave-builder /agave/target/release/solana-test-validator /usr/local/bin/

COPY --from=bpf-builder /workspace/target/sbpf-solana-solana/release/session_manager.so ./session_manager.so
COPY --from=bpf-builder /workspace/target/sbpf-solana-solana/release/chain_id.so ./chain_id.so
COPY --from=bpf-builder /workspace/target/sbpf-solana-solana/release/domain_registry.so ./domain_registry.so
COPY --from=bpf-builder /workspace/target/sbpf-solana-solana/release/intent_transfer.so ./intent_transfer.so
COPY --from=bpf-builder /workspace/spl_associated_token_account.so ./spl_associated_token_account.so
COPY --from=bpf-builder /workspace/spl_token.so ./spl_token.so

COPY --from=build /workspace/target/release/fogo-paymaster /usr/local/bin/fogo-paymaster
COPY --from=build /workspace/target/release/sessions-localnet /usr/local/bin/sessions-localnet

RUN chmod +x /usr/local/bin/fogo-paymaster /usr/local/bin/sessions-localnet

EXPOSE 8899 4000

ENTRYPOINT ["/usr/local/bin/sessions-localnet"]
