use crate::ai::{chat, extract_json, Message};
use crate::secure_storage;
use crate::AppState;
use chrono::{NaiveDate, NaiveDateTime};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct SubTask {
    pub title: String,
    pub priority: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ParseResult {
    pub title: String,
    pub priority: Option<i32>,
    pub due_date: Option<i64>,
    pub category: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiStatus {
    pub has_api_key: bool,
    pub model: String,
}

#[tauri::command]
pub async fn get_ai_status(state: State<'_, AppState>) -> Result<AiStatus, String> {
    let model = { state.ai_config.read().await.model.clone() };
    let has_api_key = secure_storage::get_api_key_async().await?.is_some();
    Ok(AiStatus { has_api_key, model })
}

#[tauri::command]
pub async fn clear_ai_api_key(state: State<'_, AppState>) -> Result<(), String> {
    secure_storage::delete_api_key_async().await?;
    // no cached key; nothing else to update
    let _ = state.ai_config.read().await;
    Ok(())
}

#[tauri::command]
pub async fn set_ai_config(
    state: State<'_, AppState>,
    api_key: Option<String>,
    model: String,
) -> Result<(), String> {
    // model is non-sensitive, kept in memory
    {
        let mut config = state.ai_config.write().await;
        config.model = model;
    }

    // api_key is sensitive, stored in Keychain; only update if provided
    if let Some(api_key) = api_key {
        let api_key = api_key.trim().to_string();
        if api_key.is_empty() {
            secure_storage::delete_api_key_async().await?;
        } else {
            secure_storage::set_api_key_async(api_key).await?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn breakdown_task(
    state: State<'_, AppState>,
    task: String,
) -> Result<Vec<SubTask>, String> {
    let model = { state.ai_config.read().await.model.clone() };
    let api_key = secure_storage::get_api_key_async()
        .await?
        .ok_or("请先在设置中配置 API Key")?;

    let prompt = format!(
        "你是一个任务规划助手。将用户的任务分解为具体、可执行的子任务。\n\
规则:\n\
1. 每个子任务应该是一个清晰的行动项\n\
2. 子任务数量控制在3-7个\n\
3. 按逻辑顺序排列\n\
4. 仅输出JSON数组,不要输出Markdown代码块/解释文字\n\
输出JSON格式: [{{\"title\": \"子任务标题\", \"priority\": 1-3}}]\n\
用户任务: {}",
        task
    );

    let messages = vec![
        Message {
            role: "system".into(),
            content: "你是一个任务规划助手。".into(),
        },
        Message {
            role: "user".into(),
            content: prompt,
        },
    ];

    let response = chat(&state.http, &api_key, &model, messages).await?;
    let json_text = extract_json(&response);
    let subtasks: Vec<SubTask> = serde_json::from_str(&json_text)
        .map_err(|e| format!("解析 AI 响应失败: {} ({})", e, json_text))?;
    Ok(subtasks)
}

#[tauri::command]
pub async fn parse_natural_language(
    state: State<'_, AppState>,
    input: String,
) -> Result<ParseResult, String> {
    let model = { state.ai_config.read().await.model.clone() };
    let api_key = secure_storage::get_api_key_async()
        .await?
        .ok_or("请先在设置中配置 API Key")?;

    let prompt = format!(
        "从用户输入中提取任务信息,仅输出JSON(不要Markdown/解释文字):\n\
{{\"title\": \"任务标题\", \"due_date\": \"YYYY-MM-DD或null\", \"priority\": 1-3, \"category\": \"分类或null\"}}\n\
用户输入: {}",
        input
    );

    let messages = vec![Message {
        role: "user".into(),
        content: prompt,
    }];

    let response = chat(&state.http, &api_key, &model, messages).await?;
    let json_text = extract_json(&response);
    let mut value: serde_json::Value = serde_json::from_str(&json_text)
        .map_err(|e| format!("解析 AI 响应失败: {} ({})", e, json_text))?;

    let title = value["title"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string();
    let priority = value["priority"].as_i64().map(|v| v as i32);
    let category = value["category"].as_str().map(|v| v.to_string());
    let due_date = value["due_date"].as_str().and_then(parse_date_to_timestamp);

    if title.is_empty() {
        value["title"] = serde_json::Value::String(input.clone());
    }

    Ok(ParseResult {
        title: if title.is_empty() { input } else { title },
        priority,
        due_date,
        category,
    })
}

fn parse_date_to_timestamp(date_str: &str) -> Option<i64> {
    let date = NaiveDate::parse_from_str(date_str, "%Y-%m-%d").ok()?;
    let datetime = NaiveDateTime::new(date, chrono::NaiveTime::from_hms_opt(0, 0, 0)?);
    Some(datetime.and_utc().timestamp())
}
