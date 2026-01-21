use keyring::{Entry, Error};

const SERVICE: &str = "com.liang.fanqie-todo";
const ACCOUNT: &str = "dashscope_api_key";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| format!("Keychain 初始化失败: {}", e))
}

pub fn set_api_key(api_key: &str) -> Result<(), String> {
    let api_key = api_key.trim();
    if api_key.is_empty() {
        return Err("API Key 不能为空".into());
    }
    entry()?
        .set_password(api_key)
        .map_err(|e| format!("保存 API Key 失败: {}", e))
}

pub fn get_api_key() -> Result<Option<String>, String> {
    match entry()?.get_password() {
        Ok(val) => Ok(Some(val)),
        Err(Error::NoEntry) => Ok(None),
        Err(err) => Err(format!("读取 API Key 失败: {}", err)),
    }
}

pub fn delete_api_key() -> Result<(), String> {
    match entry()?.delete_password() {
        Ok(()) => Ok(()),
        Err(Error::NoEntry) => Ok(()),
        Err(err) => Err(format!("删除 API Key 失败: {}", err)),
    }
}

pub async fn set_api_key_async(api_key: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || set_api_key(&api_key))
        .await
        .map_err(|e| format!("保存 API Key 失败: {}", e))?
}

pub async fn get_api_key_async() -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(get_api_key)
        .await
        .map_err(|e| format!("读取 API Key 失败: {}", e))?
}

pub async fn delete_api_key_async() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(delete_api_key)
        .await
        .map_err(|e| format!("删除 API Key 失败: {}", e))?
}
