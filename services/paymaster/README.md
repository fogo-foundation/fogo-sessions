# Paymaster

The Sessions Paymaster service provides apps with a way to fund user transactions on their frontends. This allows users to conduct these transactions without needing to hold native FOGO.

You can view metrics for the service at port 4000.

## Constraints

The constraints API enables apps to set up filters for what kinds of transactions they wish to permit their paymasters to pay for. The paymaster filters are intended to regulate what transactions apps pay for, rather than constrain actions on the frontend to a non-exploitable surface. Accordingly, the constraints should be designed to outline appropriate use of the app's funds toward relevant user actions. This will help to ensure that these funds are only spent on legitimate use of the app's relevant frontend functions by retail users.

Thus, rather than avoid exploits, the paymaster filters should focus on constraining the action space to bonafide transactions that would be undertaken on the app's frontend.

The constraints are expressed in terms of `TransactionVariation` objects. Each `TransactionVariation` describes constraints on a transaction that must all be passed in order for a transaction to be considered valid. A transaction must pass at least one of an app's configured `TransactionVariation`s in order to gain approval to use the paymaster's funds.

### v0: `VariationProgramWhitelist`

v0 is a simple whitelist-based constraint set. A set of whitelisted programs is specified, and the transaction will pass iff every instruction's program is in the whitelist.

There are no constraints on instruction ordering, accounts, or data.

### v1: `VariationOrderedInstructionConstraints`

v1 is a more fleshed out constraint set. It introduces constraints on each instruction in the transaction as well as a max gas spend (this checks the signature gas cost plus the priority fee). A list of instruction constraints is specified in order, with each instruction constraint containing:

- a program ID to match against
- a list of account constraints
  - each of these specifies the account in the instruction to check and a set of accounts to include and exclude from matching against
- a list of data constraints
  - each of these specifies the location of the data and a type, value(s), and (in)equality to match against
- a boolean indicating whether this instruction is explicitly required in the transaction.

v1 does not enforce relationships across instructions (e.g. require instruction Y if instruction X is present, constrain data in instruction Y based on the value of data in instruction X). In this way, it is relatively stateless and allows for simple absolute constraints on the instructions.

## Metrics and Logs

The paymaster service records some metrics via Prometheus and some spans for timing of the transaction validation/submission/confirmation flow via OpenTelemetry. The service exports these OpenTelemetry spans to `localhost:4317` by default. You can configure sending these to a different destination by setting the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable, or by providing the `otlp_endpoint` CLI arg.

You can run a local all in one jaeger instance to collect and visualize these spans by running:

```bash
docker run --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4317:4317 \
  jaegertracing/all-in-one:1.63.0
```

## Transaction Validator Tool

The crate also exposes a cli tool to validate arbitrary transactions against a specified config. You can run this via the following command:

```
cargo run --bin paymaster-tx-validator validate -c <CONFIG_PATH> --rpc-url-http <RPC_URL_HTTP> --transaction-hash <ONCHAIN_TRANSACTION_HASH>
```

Alternatively, you can provide a serialized transaction as a base64 string via the `--transaction` argument in place of the hash. Additionally, you could ask the tool to validate a specified number of the most recent transactions that interacted with this domain's sponsor pubkey via:

```
cargo run --bin paymaster-tx-validator validate -c <CONFIG_PATH> --rpc-url-http <RPC_URL_HTTP> --domain <DOMAIN> --recent-sponsor-txs <NUMBER_OF_RECENT_TXS>
```

Note that in this case, you must specify the domain you wish to match against and pull recent transactions for, unless your config only has 1 domain.

You can optionally provide the name of the domain you wish to match against via `--domain`. The tool will print out the set of transaction variations that the provided transaction matches against.
