use crate::api::DomainState;
use arc_swap::ArcSwap;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::interval;

pub fn is_enough_balance(balance: Option<&u64>, minimum_balance_lamports: u64) -> bool {
    balance
        .map(|balance| *balance >= minimum_balance_lamports)
        .unwrap_or(true) // Return true if we don't know what is the balance
}

pub fn spawn_balances_refresher(
    domains: Arc<ArcSwap<HashMap<String, DomainState>>>,
    balances: Arc<ArcSwap<HashMap<Pubkey, u64>>>,
    rpc_client: Arc<RpcClient>,
    balances_refresh_interval_seconds: u64,
) {
    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_secs(balances_refresh_interval_seconds));
        ticker.tick().await;
        loop {
            ticker.tick().await;
            let domains = domains.load();
            let pubkeys = domains
                .iter()
                .flat_map(|(_, domain)| domain.sponsors.iter().map(|sponsor| sponsor.pubkey()))
                .collect::<Vec<Pubkey>>();
            let new_balances = rpc_client
                .get_multiple_accounts(&pubkeys)
                .await
                .inspect_err(|e| tracing::warn!("Failed to refresh balances: {}", e))
                .map(|accounts| {
                    pubkeys
                        .into_iter()
                        .zip(accounts)
                        .map(|(pubkey, account)| (pubkey, account.map(|a| a.lamports).unwrap_or(0)))
                        .collect::<HashMap<Pubkey, u64>>()
                })
                .unwrap_or(HashMap::new());
            tracing::debug!("The new balances are: {:?}", new_balances);
            balances.store(Arc::new(new_balances));
        }
    });
}
