use reqwest::{header::RETRY_AFTER, Client, StatusCode};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::sleep;

const DASHSCOPE_API_URL: &str = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

const MAX_ATTEMPTS: usize = 3;
const BASE_BACKOFF_MS: u64 = 400;
const MAX_BACKOFF_MS: u64 = 6_000;

#[derive(Debug, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<Message>,
    stream: bool,
}

pub async fn chat(
    client: &Client,
    api_key: &str,
    model: &str,
    messages: Vec<Message>,
) -> Result<String, String> {
    let request = ChatRequest {
        model: model.to_string(),
        messages,
        stream: false,
    };

    for attempt in 1..=MAX_ATTEMPTS {
        let result = client
            .post(DASHSCOPE_API_URL)
            .bearer_auth(api_key)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await;

        match result {
            Ok(resp) => {
                let status = resp.status();
                if status.is_success() {
                    let value: serde_json::Value = resp
                        .json()
                        .await
                        .map_err(|e| format!("解析响应失败: {}", e))?;

                    let content = value
                        .get("choices")
                        .and_then(|v| v.get(0))
                        .and_then(|v| v.get("message"))
                        .and_then(|v| v.get("content"))
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .trim()
                        .to_string();

                    if content.is_empty() {
                        return Err("AI 响应为空".into());
                    }

                    return Ok(content);
                }

                let retry_after_ms = parse_retry_after_ms(&resp);
                let body = resp.text().await.unwrap_or_default();
                let msg = format_http_error(status, &body);

                if should_retry(status) && attempt < MAX_ATTEMPTS {
                    sleep(backoff_duration(attempt, retry_after_ms)).await;
                    continue;
                }

                return Err(msg);
            }
            Err(err) => {
                let msg = format!("请求失败: {}", err);
                if attempt < MAX_ATTEMPTS {
                    sleep(backoff_duration(attempt, None)).await;
                    continue;
                }
                return Err(msg);
            }
        }
    }

    Err("请求失败".into())
}

fn should_retry(status: StatusCode) -> bool {
    status == StatusCode::TOO_MANY_REQUESTS
        || status == StatusCode::REQUEST_TIMEOUT
        || status.is_server_error()
}

fn parse_retry_after_ms(resp: &reqwest::Response) -> Option<u64> {
    let value = resp.headers().get(RETRY_AFTER)?.to_str().ok()?;
    let seconds = value.parse::<u64>().ok()?;
    Some(seconds.saturating_mul(1000))
}

fn backoff_duration(attempt: usize, retry_after_ms: Option<u64>) -> Duration {
    let ms = if let Some(ms) = retry_after_ms {
        ms
    } else {
        let a = attempt as u64;
        BASE_BACKOFF_MS.saturating_mul(a.saturating_mul(a))
    };
    Duration::from_millis(ms.min(MAX_BACKOFF_MS))
}

fn format_http_error(status: StatusCode, body: &str) -> String {
    // Best-effort parse of OpenAI-like error structure.
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(body) {
        if let Some(msg) = v
            .get("error")
            .and_then(|e| e.get("message"))
            .and_then(|m| m.as_str())
        {
            return format!("AI 请求失败 ({}): {}", status.as_u16(), msg);
        }
        if let Some(msg) = v.get("message").and_then(|m| m.as_str()) {
            return format!("AI 请求失败 ({}): {}", status.as_u16(), msg);
        }
    }

    let brief = body.trim();
    if brief.is_empty() {
        format!("AI 请求失败 ({})", status.as_u16())
    } else {
        let brief = if brief.len() > 300 {
            format!("{}...", &brief[..300])
        } else {
            brief.to_string()
        };
        format!("AI 请求失败 ({}): {}", status.as_u16(), brief)
    }
}

pub fn extract_json(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.starts_with("```") {
        let trimmed = trimmed.trim_matches('`');
        let trimmed = trimmed.replace("json", "");
        return trimmed.trim().to_string();
    }
    if let Some(start) = trimmed.find('{') {
        if let Some(end) = trimmed.rfind('}') {
            if end > start {
                return trimmed[start..=end].to_string();
            }
        }
    }
    if let Some(start) = trimmed.find('[') {
        if let Some(end) = trimmed.rfind(']') {
            if end > start {
                return trimmed[start..=end].to_string();
            }
        }
    }
    trimmed.to_string()
}
