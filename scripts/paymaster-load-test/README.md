# Paymaster Load Test

A comprehensive load testing tool for the Fogo paymaster service. This tool allows you to evaluate the performance, throughput, and success rates of your paymaster service under various load conditions.

## Features

- **Configurable Request Rate**: Control the rate of requests sent to the paymaster
- **Transaction Validity Control**: Mix valid and invalid transactions to test validation logic
- **Detailed Metrics**: Track success rates and latency percentiles
- **Real-time Progress**: Monitor test progress with live updates
- **Blockchain Confirmation**: Optional verification of on-chain transaction status

## Installation

Build the tool using Cargo:

```bash
cargo build --release --bin paymaster-load-test
```

## Usage

### Configuration File

The tool uses a TOML configuration file to specify the target environment and transaction distribution.

Configuration Parameters

[external] section - Target environment settings:

- paymaster_endpoint: URL of the paymaster service to test
- rpc_url: Solana RPC endpoint URL (used for fetching blockhashes)
- domain: Domain string for session establishment (must match paymaster's domain registry)
- chain_id: Chain identifier (e.g., "localnet", "devnet", "mainnet-beta")

[validity] section - Transaction type distribution:

- valid_rate: Proportion of valid transactions (0.0-1.0)
- invalid_signature_rate: Proportion with invalid session signatures
- invalid_constraint_rate: Proportion calling non-whitelisted programs
- invalid_fee_payer_rate: Proportion with wrong fee payer
- invalid_gas_rate: Proportion exceeding gas limits

All validity rates must sum to exactly 1.0.

### Basic Example (Localnet)

Test against the paymaster with a 5-minute load test with 100 req/s:

```bash
cargo run --release --bin paymaster-load-test -- \
  -c <PATH_TO_CONFIG_FILE>
  -d 300 \
  -r 100 \
```

## Understanding the Output

The tool provides a comprehensive report including:

### Overall Results

- Total requests sent
- Success and failure counts
- Achieved request rate vs target
- Latency metrics
- Breakdowns of the above by transaction validity type
