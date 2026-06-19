import { pgTable, serial, text, integer, timestamp, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';

// 枚举类型
export const categoryEnum = pgEnum('category', ['girlfriend', 'boyfriend']);
export const statusEnum = pgEnum('status', ['in_progress', 'success', 'failed']);
export const roleEnum = pgEnum('role', ['user', 'assistant']);

// 场景表
export const scenarios = pgTable('scenarios', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  emotion_level: integer('emotion_level').default(3),
  stage_config: jsonb('stage_config'),
  category: categoryEnum('category').default('girlfriend'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 用户表
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 会话表
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  scenario_id: integer('scenario_id').references(() => scenarios.id),
  user_id: integer('user_id').references(() => users.id),
  current_stage: integer('current_stage').default(1),
  status: statusEnum('status').default('in_progress'),
  rounds_count: integer('rounds_count').default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 会话消息表
export const sessionMessages = pgTable('session_messages', {
  id: serial('id').primaryKey(),
  session_id: integer('session_id').references(() => sessions.id),
  role: roleEnum('role').notNull(),
  content: text('content').notNull(),
  stage: integer('stage'),
  created_at: timestamp('created_at').defaultNow(),
});

// 进度记录表
export const progressRecords = pgTable('progress_records', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  scenario_id: integer('scenario_id').references(() => scenarios.id),
  total_attempts: integer('total_attempts').default(0),
  success_count: integer('success_count').default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
