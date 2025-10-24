use sqlx::{postgres::PgPoolOptions, PgPool};
use tokio::sync::OnceCell;

static POOL: OnceCell<PgPool> = OnceCell::const_new();

/// Initialize the database connection pool and runs any pending migrations.
pub async fn init_db_connection(database_url: &str) -> Result<(), sqlx::Error> {
    if POOL.initialized() {
        return Ok(());
    }
    POOL.get_or_try_init(|| async {
        PgPoolOptions::new()
            .max_connections(5)
            .connect(database_url)
            .await
    })
    .await?;

    Ok(())
}

pub async fn run_migrations() -> Result<(), sqlx::Error> {
    sqlx::migrate!("./migrations").run(pool()).await?;
    Ok(())
}

/// Get the database connection pool.
pub fn pool() -> &'static PgPool {
    POOL.get()
        .expect("DB pool not initialized; call init_db_connection() first")
}
