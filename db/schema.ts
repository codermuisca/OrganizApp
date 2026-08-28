import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  status: text('status', { enum: ['todo', 'progress', 'done'] }).notNull().default('todo'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).notNull().default('medium'),
  tag: text('tag').notNull().default('Personal'),
  dueDate: text('due_date').notNull().default(''),
  assignee: text('assignee').notNull().default('CM'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('idx_tasks_status_created').on(table.status, table.createdAt)]);
