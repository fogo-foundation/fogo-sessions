FROM rust:1.87.0 AS build

WORKDIR /src
COPY . .

RUN --mount=type=cache,target=./target/ \
    --mount=type=cache,target=/usr/local/cargo/git/db/ \
    --mount=type=cache,target=/usr/local/cargo/registry/ \
    cargo build -p fogo-paymaster --release --locked

RUN --mount=type=cache,target=./target/ cp -r ./target/release ./output

FROM debian:bookworm-20250630

# Copy artifacts from other images
COPY --from=build /src/output/fogo-paymaster /usr/local/bin/