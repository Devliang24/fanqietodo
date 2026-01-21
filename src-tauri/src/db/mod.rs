use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::str::FromStr;
use tauri::{AppHandle, Manager};

pub async fn init_db(app: &AppHandle) -> Result<SqlitePool, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {}", e))?;
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("创建数据目录失败: {}", e))?;

    let db_path = app_data_dir.join("fanqie-todo.db");
    let mut options = SqliteConnectOptions::from_str(
        db_path
            .to_str()
            .ok_or("数据库路径包含无效字符")?,
    )
    .map_err(|e| format!("数据库路径解析失败: {}", e))?;

    options = options
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|e| format!("连接数据库失败: {}", e))?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|e| format!("执行数据库迁移失败: {}", e))?;

    Ok(pool)
}
