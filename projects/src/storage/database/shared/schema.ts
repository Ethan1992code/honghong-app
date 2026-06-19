import { pgTable, index, foreignKey, varchar, integer, timestamp, serial, text, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const sessions = pgTable("sessions", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	scenarioId: integer("scenario_id").notNull(),
	userId: varchar("user_id", { length: 36 }).default(sql`gen_random_uuid()`).notNull(),
	currentStage: integer("current_stage").default(1).notNull(),
	status: varchar({ length: 20 }).default('in_progress').notNull(),
	roundsCount: integer("rounds_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sessions_scenario_id_idx").using("btree", table.scenarioId.asc().nullsLast().op("int4_ops")),
	index("sessions_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.scenarioId],
			foreignColumns: [scenarios.id],
			name: "sessions_scenario_id_scenarios_id_fk"
		}),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const scenarios = pgTable("scenarios", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 100 }).notNull(),
	description: text().notNull(),
	emotionLevel: integer("emotion_level").default(3).notNull(),
	stageConfig: jsonb("stage_config").notNull(),
	category: varchar({ length: 20 }).default('girlfriend').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("scenarios_title_idx").using("btree", table.title.asc().nullsLast().op("text_ops")),
	index("scenarios_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
]);

export const progressRecords = pgTable("progress_records", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	scenarioId: integer("scenario_id").notNull(),
	totalAttempts: integer("total_attempts").default(0).notNull(),
	successCount: integer("success_count").default(0).notNull(),
	bestRounds: integer("best_rounds"),
	lastRounds: integer("last_rounds"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("progress_records_scenario_id_idx").using("btree", table.scenarioId.asc().nullsLast().op("int4_ops")),
	index("progress_records_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.scenarioId],
			foreignColumns: [scenarios.id],
			name: "progress_records_scenario_id_scenarios_id_fk"
		}),
]);

export const sessionMessages = pgTable("session_messages", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 36 }).notNull(),
	role: varchar({ length: 10 }).notNull(),
	content: text().notNull(),
	stage: integer().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("session_messages_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "session_messages_session_id_sessions_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: serial("id").primaryKey().notNull(),
	username: varchar("username", { length: 50 }).notNull().unique(),
	password: varchar("password", { length: 255 }).notNull(),
	email: varchar("email", { length: 100 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("users_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
]);
