use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use tokio::sync::OnceCell;

pub static POOL: OnceCell<sqlx::PgPool> = OnceCell::const_new();

pub async fn init_db_connection(database_url: String) -> Result<(), sqlx::Error> {
    let pool = POOL
        .get_or_try_init(|| async {
            PgPoolOptions::new()
                .max_connections(5)
                .connect(&database_url)
                .await
        })
        .await?;

    // run migrations
    sqlx::migrate!("src/db/migrations").run(pool).await?;

    Ok(())
}

pub fn pool() -> &'static Pool<Postgres> {
    POOL.get()
        .expect("DB pool not initialized; call init_db_connection() first")
}
