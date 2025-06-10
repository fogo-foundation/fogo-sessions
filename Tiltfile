local_resource(
    "build-programs",
    "anchor run build-idl",
)

local_resource(
    "svm-localnet",
    serve_cmd="solana-test-validator \
        --bpf-program $(solana-keygen pubkey ./keypairs/session-manager.json) \
        ../target/deploy/session_manager.so \
        --mint $(solana-keygen pubkey ./keypairs/sponsor.json) \
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
    "web-app",
    serve_cmd="pnpm turbo start:dev",
    resource_deps=["svm-localnet"],
)