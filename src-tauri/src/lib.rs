mod ai;
mod commands;
mod db;
mod secure_storage;

use reqwest::Client;
use sqlx::SqlitePool;
use std::{sync::Arc, time::Duration};
use tauri::Manager;
use tokio::sync::RwLock;

pub struct AppState {
    pub db: SqlitePool,
    pub http: Client,
    pub ai_config: Arc<RwLock<AiConfig>>,
}

#[derive(Debug, Default)]
pub struct AiConfig {
    pub model: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle();
            let pool = tauri::async_runtime::block_on(db::init_db(&handle))
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

            let http = Client::builder()
                .timeout(Duration::from_secs(20))
                .connect_timeout(Duration::from_secs(10))
                .build()
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

            app.manage(AppState {
                db: pool,
                http,
                ai_config: Arc::new(RwLock::new(AiConfig {
                    model: "qwen-turbo".to_string(),
                })),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::todo::create_todo,
            commands::todo::list_todos,
            commands::todo::update_todo,
            commands::todo::delete_todo,
            commands::todo::get_todo_by_id,
            commands::ai::get_ai_status,
            commands::ai::set_ai_config,
            commands::ai::clear_ai_api_key,
            commands::ai::breakdown_task,
            commands::ai::parse_natural_language
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
