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
        --account-dir ./accounts \
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

LOOKUP_TABLE_ADDRESSES=[
    "Sysvar1nstructions1111111111111111111111111",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "11111111111111111111111111111111",            
    "So11111111111111111111111111111111111111112", 
    "FrfXhepGSPsSYXzvEsAxzVW8zDaxdWSneaERaDC1Q911" 
]

local_resource(
    "initialize-session-manager",
    """
    pnpm turbo run:initialize-session-manager -- -u l -k ./tilt/keypairs/sponsor.json --chain-id localnet
    """,
    resource_deps=["svm-localnet"],
)

local_resource(
    "setup-address-lookup-table",
    """
    solana address-lookup-table extend --keypair ./tilt/keypairs/sponsor.json \
    93QGBU8ZHuvyKSvDFeETsdek1KQs4gqk3mEVKG8UxoX3 \
    --addresses %s
    """ % ",".join(LOOKUP_TABLE_ADDRESSES),
    resource_deps=["svm-localnet"],
)

local_resource(
    "web-app",
    serve_cmd="pnpm turbo start:dev",
    resource_deps=["setup-wrapped-sol-faucet", "setup-address-lookup-table", "initialize-session-manager"],
)