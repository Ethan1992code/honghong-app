import { relations } from "drizzle-orm/relations";
import { scenarios, sessions, progressRecords, sessionMessages } from "./schema";

export const sessionsRelations = relations(sessions, ({one, many}) => ({
	scenario: one(scenarios, {
		fields: [sessions.scenarioId],
		references: [scenarios.id]
	}),
	sessionMessages: many(sessionMessages),
}));

export const scenariosRelations = relations(scenarios, ({many}) => ({
	sessions: many(sessions),
	progressRecords: many(progressRecords),
}));

export const progressRecordsRelations = relations(progressRecords, ({one}) => ({
	scenario: one(scenarios, {
		fields: [progressRecords.scenarioId],
		references: [scenarios.id]
	}),
}));

export const sessionMessagesRelations = relations(sessionMessages, ({one}) => ({
	session: one(sessions, {
		fields: [sessionMessages.sessionId],
		references: [sessions.id]
	}),
}));