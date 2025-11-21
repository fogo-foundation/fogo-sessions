local_resource(
    "build-programs",
    "anchor build --no-idl",
)

local_resource(
    "svm-localnet",
    serve_cmd="solana-test-validator \
        --bpf-program SesswvJ7puvAgpyqp7N8HnjNnvpnS8447tKNF3sPgbC \
        ../target/deploy/session_manager.so \
        --bpf-program Examtz9qAwhxcADNFodNA2QpxK7SM9bCHyiaUvWvFBM3 \
        ../target/deploy/example.so \
        --bpf-program Cha1RcWkdcF1dmGuTui53JmSnVCacCc2Kx2SY7zSFhaN \
        ../target/deploy/chain_id.so \
        --bpf-program DomaLfEueNY6JrQSEFjuXeUDiohFmSrFeTNTPamS2yog \
        ../target/deploy/domain_registry.so \
        --bpf-program Xfry4dW9m42ncAqm8LyEnyS5V6xu5DSJTMRQLiGkARD \
        ../target/deploy/intent_transfer.so \
        --mint $(solana-keygen pubkey ./keypairs/faucet.json) \
        --bpf-program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA ./programs/spl_token.so \
        --bpf-program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL ./programs/spl_associated_token_account.so \
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
    """spl-token -u l wrap 100 --fee-payer ./tilt/keypairs/faucet.json ./tilt/keypairs/faucet.json""",
    resource_deps=["svm-localnet"],
)

local_resource(
    "setup-sponsor",
    """
    solana -u l airdrop 1 5SKUh8pPXYCa5GroGKgniL1Gjt7XHKQkkjK94nVXfSkF && # http://localhost:3000 domain
    solana -u l airdrop 1 HCHyvfDFW8tvefdaSX9XLeemqYoC5gYPfh5HnzbyfaMy # sessions domain
    """,
    resource_deps=["svm-localnet"],
)

LOOKUP_TABLE_ADDRESSES=[
    "Sysvar1nstructions1111111111111111111111111",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "11111111111111111111111111111111",            
    "So11111111111111111111111111111111111111112", 
    "akbpBKqNWBiZn3ejes3ejieJ5t3vqEhoq1ZzLBG7jQo",
    "GCUiTxhnGexbHj1kMFVzupjx4azktm12HNoePXjJmTLh",
    "6dM4TqWyWJsbx7obrdLcviBkTafD5E8av61zfU6jq57X",
    "8MEFa571enhk3iTPsZML7ZxyM7edchbiwU3U1L1aAZBW"
]

local_resource(
    "initialize-programs",
    """
    pnpm turbo run:initialize-chain-id -- -u l -k ./tilt/keypairs/faucet.json localnet &&
    pnpm turbo run:add-program-id-to-domain-registry -- http://localhost:3000 Examtz9qAwhxcADNFodNA2QpxK7SM9bCHyiaUvWvFBM3 -u l -k ./tilt/keypairs/faucet.json

    """,
    resource_deps=["svm-localnet"],
)

local_resource(
    "setup-address-lookup-table",
    """
    solana address-lookup-table extend -u l \
    --keypair ./tilt/keypairs/faucet.json \
    93QGBU8ZHuvyKSvDFeETsdek1KQs4gqk3mEVKG8UxoX3 \
    --addresses %s
    """ % ",".join(LOOKUP_TABLE_ADDRESSES),
    resource_deps=["svm-localnet"],
)

local_resource(
    "paymaster",
    serve_cmd="cargo run --bin fogo-paymaster migrate --db-url postgres://paymaster:paymaster@localhost:5432/paymaster && cargo run --bin fogo-paymaster run --db-url postgres://paymaster:paymaster@localhost:5432/paymaster --ntt-quoter 0x5241c9276698439fef2780dbab76fec90b633fbd --config-file ./tilt/configs/paymaster.toml --rpc-url-http http://localhost:8899 --rpc-url-ws ws://localhost:8900",
    resource_deps=["svm-localnet"],
)

local_resource(
    "Demo Webapp",
    serve_cmd="pnpm turbo --filter @fogo/sessions-demo... start:dev",
    resource_deps=["setup-wrapped-sol-faucet", "setup-sponsor", "setup-address-lookup-table", "initialize-programs", "paymaster"],
)
