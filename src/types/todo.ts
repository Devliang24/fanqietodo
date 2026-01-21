export type TodoStatus = "pending" | "in_progress" | "completed";

export interface Todo {
  id: string;
  title: string;
  description?: string | null;
  status: TodoStatus;
  priority: number;
  category?: string | null;
  due_date?: number | null;
  created_at: number;
  updated_at: number;
  parent_id?: string | null;
  ai_generated: boolean;
}

export interface CreateTodoInput {
  title: string;
  description?: string | null;
  priority?: number;
  category?: string | null;
  due_date?: number | null;
  parent_id?: string | null;
  ai_generated?: boolean;
}

export interface UpdateTodoInput {
  id: string;
  title?: string | null;
  description?: string | null;
  status?: TodoStatus;
  priority?: number | null;
  category?: string | null;
  due_date?: number | null;
  parent_id?: string | null;
  ai_generated?: boolean | null;
}
