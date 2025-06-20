local_resource(
    "build-programs",
    "cargo build-sbf",
)

local_resource(
    "svm-localnet",
    serve_cmd="solana-test-validator \
        --bpf-program $(solana-keygen pubkey ./keypairs/session-manager.json) \
        ../target/deploy/session_manager.so \
        --bpf-program $(solana-keygen pubkey ./keypairs/example.json) \
        ../target/deploy/example.so \
        --mint $(solana-keygen pubkey ./keypairs/sponsor.json) \
        --bpf-program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA ./programs/spl_token.so \
        --reset",
    serve_dir="./tilt",
    # check readiness by sending a health GET query to the RPC url
    readiness_probe=probe(
        period_secs=10,
        http_get = http_get_action(port=8899, host="localhost", scheme="http", path="/health")
    ),
    resource_deps=["build-programs"],
)

local_resource(
    "setup-wrapped-sol-faucet",
    """spl-token -u l wrap 100 --fee-payer ./tilt/keypairs/sponsor.json ./tilt/keypairs/sponsor.json""",
    resource_deps=["svm-localnet"],
)

local_resource(
    "web-app",
    serve_cmd="pnpm turbo start:dev",
    resource_deps=["setup-wrapped-sol-faucet"],
)