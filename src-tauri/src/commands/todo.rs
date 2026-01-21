use crate::AppState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: i32,
    pub category: Option<String>,
    pub due_date: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
    pub parent_id: Option<String>,
    pub ai_generated: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateTodoInput {
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<i32>,
    pub category: Option<String>,
    pub due_date: Option<i64>,
    pub parent_id: Option<String>,
    pub ai_generated: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTodoInput {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<i32>,
    pub category: Option<String>,
    pub due_date: Option<i64>,
    pub parent_id: Option<String>,
    pub ai_generated: Option<bool>,
}

#[tauri::command]
pub async fn create_todo(
    state: State<'_, AppState>,
    input: CreateTodoInput,
) -> Result<Todo, String> {
    let now = Utc::now().timestamp();
    let id = Uuid::new_v4().to_string();
    let status = "pending".to_string();
    let priority = input.priority.unwrap_or(2);
    let ai_generated = input.ai_generated.unwrap_or(false);

    sqlx::query(
        r#"
        INSERT INTO todos (
            id, title, description, status, priority, category,
            due_date, created_at, updated_at, parent_id, ai_generated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(&input.title)
    .bind(&input.description)
    .bind(&status)
    .bind(priority)
    .bind(&input.category)
    .bind(input.due_date)
    .bind(now)
    .bind(now)
    .bind(&input.parent_id)
    .bind(ai_generated)
    .execute(&state.db)
    .await
    .map_err(|e| format!("创建任务失败: {}", e))?;

    get_todo_by_id(state, id).await
}

#[tauri::command]
pub async fn list_todos(state: State<'_, AppState>) -> Result<Vec<Todo>, String> {
    let todos = sqlx::query_as::<_, Todo>(
        r#"
        SELECT id, title, description, status, priority, category, due_date,
               created_at, updated_at, parent_id, ai_generated
        FROM todos
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| format!("读取任务失败: {}", e))?;

    Ok(todos)
}

#[tauri::command]
pub async fn update_todo(
    state: State<'_, AppState>,
    input: UpdateTodoInput,
) -> Result<Todo, String> {
    let now = Utc::now().timestamp();

    sqlx::query(
        r#"
        UPDATE todos
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            status = COALESCE(?, status),
            priority = COALESCE(?, priority),
            category = COALESCE(?, category),
            due_date = COALESCE(?, due_date),
            parent_id = COALESCE(?, parent_id),
            ai_generated = COALESCE(?, ai_generated),
            updated_at = ?
        WHERE id = ?
        "#,
    )
    .bind(input.title)
    .bind(input.description)
    .bind(input.status)
    .bind(input.priority)
    .bind(input.category)
    .bind(input.due_date)
    .bind(input.parent_id)
    .bind(input.ai_generated)
    .bind(now)
    .bind(&input.id)
    .execute(&state.db)
    .await
    .map_err(|e| format!("更新任务失败: {}", e))?;

    get_todo_by_id(state, input.id).await
}

#[tauri::command]
pub async fn delete_todo(state: State<'_, AppState>, id: String) -> Result<(), String> {
    // Delete the task and all its descendants (subtasks) to avoid foreign key constraint errors.
    sqlx::query(
        r#"
        WITH RECURSIVE descendants(id) AS (
            SELECT id FROM todos WHERE id = ?
            UNION ALL
            SELECT t.id
            FROM todos t
            JOIN descendants d ON t.parent_id = d.id
        )
        DELETE FROM todos WHERE id IN (SELECT id FROM descendants)
        "#,
    )
    .bind(&id)
    .execute(&state.db)
    .await
    .map_err(|e| format!("删除任务失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_todo_by_id(state: State<'_, AppState>, id: String) -> Result<Todo, String> {
    let todo = sqlx::query_as::<_, Todo>(
        r#"
        SELECT id, title, description, status, priority, category, due_date,
               created_at, updated_at, parent_id, ai_generated
        FROM todos
        WHERE id = ?
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| format!("任务不存在: {}", e))?;

    Ok(todo)
}
