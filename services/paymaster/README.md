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

## Running

### Prerequisites

- Provision Postgres (Docker Compose is available via `docker-compose.yml`).
- Copy `.env.example` to `.env` and adjust the values to match your local setup.

### Database

Start the Postgres container (and the optional `pgweb` UI) with:

```bash
docker compose up
```

Confirm that `DATABASE_URL` in your environment matches the credentials that the container exposes.

This will:

- spin up a local postgres 17 database which can be used to connect the paymaster on `postgres://paymaster:paymaster@localhost:5432/paymaster`
- run pgweb which exposes a web interface on http://localhost:8080/

### Migrations

Migrations are located in: `services/paymaster/migrations`, and can be run using:

```bash
cargo run --bin fogo-paymaster migrate
```

### Seeding

Seeding is optional, but simplifies bootstrapping a local configuration. Provide both a database URL, a path to a TOML config (an example lives at `tilt/configs/paymaster.toml`), and the network you'd like this config to live in (eg: `testnet`/`mainnet`):

```bash
cargo run --bin paymaster-config-sync -- --config="./tilt/configs/paymaster.toml" --db-url="postgres://paymaster:paymaster@localhost:5432/paymaster" --network-environment testnet
```

note that running the `paymaster-config-sync` multiple times will act as an upsert command where it will create variations if they don't exist or update them if they're already present in the db.

### Running the paymaster

Launch the service with either environment variables or explicit flags. The minimum inputs are the database URL, HTTP RPC endpoint, network (eg. `testnet`/`mainnet`) and a mnemonic file path for the sponsor wallet. Example:

```bash
cargo run --bin fogo-paymaster run \
  --db-url "postgres://paymaster:paymaster@localhost:5432/paymaster" \
  --rpc-url-http https://testnet-alt.fogo.io \
  --mnemonic-file ./tilt/secrets/mnemonic
  --network-environment testnet
```

Optional flags:

- `--rpc-url-ws` (defaults to replacing `http` with `ws` on the HTTP URL)
- `--listen-address` (default `0.0.0.0:4000`)
- `--otlp-endpoint` for exporting OpenTelemetry traces (default `http://localhost:4317`)
- `--db-refresh-interval-seconds` for how frequently domain config is refreshed (default `10` secs)
- `--valiant-api-key` to enable swapping of accrued fee tokens into FOGO as per specifications in the config
- `--valiant-override-url` to override the default Valiant endpoint used by the paymaster. The default behavior is determined according to the `--network-environment` flag; this override flag is handy particularly in the case of localnet testing.
- `--fee-coefficients` to configure per-token fee multipliers, format is `{ "MINT_PUBKEY": "COEFFFICIENT" }` (example: `'{"So11111111111111111111111111111111111111112": "1", "uSd2czE61Evaf76RNbq4KPpXnkiL3irdzgLFUMe3NoG": "25000"}'`). By default the value is `{}`

You can also rely on the `.env`(see `.env.example`) values and simply run `cargo run --bin fogo-paymaster run`.

### Making changes to the DB

Create a new migration file:

```bash
sqlx migrate add -r <migration_name>
```

Run the migration:

```bash
SQLX_OFFLINE=true cargo run --bin fogo-paymaster migrate --db-url="postgres://paymaster:paymaster@localhost:5432/paymaster"
```

Update your code and queries accordingly and then run the sqlx prepare command:

```bash
# if you chanegd the queries for paymaster-config-sync
cargo sqlx prepare -- --bin paymaster-config-sync --workspace

# if you changed the queries for the fogo-paymaster
cargo sqlx prepare -- --bin fogo-paymaster --workspace
```

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
cargo run --bin paymaster-tx-validator validate -c <CONFIG_PATH> --network <testnet|mainnet> --transaction-hash <ONCHAIN_TRANSACTION_HASH> (--rpc-url-http <RPC_URL_HTTP>)
```

Alternatively, you can provide a serialized transaction as a base64 string via the `--transaction` argument in place of the hash. Additionally, you could ask the tool to validate a specified number of the most recent transactions that interacted with this domain's sponsor pubkey via:

```
cargo run --bin paymaster-tx-validator validate -c <CONFIG_PATH> --network <testnet|mainnet> --domain <DOMAIN> --recent-sponsor-txs <NUMBER_OF_RECENT_TXS> (--rpc-url-http <RPC_URL_HTTP>)
```

Note that in this case, you must specify the domain you wish to match against and pull recent transactions for, unless your config only has 1 domain.

You can optionally provide the name of the domain you wish to match against via `--domain`. The tool will print out the set of transaction variations that the provided transaction matches against. If `--domain` is provided, you can optionally provide the name of a particular variation you wish to match against via `--variation`. The tool will then print out additional logging showing the exact errors in each case that a transaction does not match against this domain and variation combination.
