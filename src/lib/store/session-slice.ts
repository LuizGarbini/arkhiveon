import type { StateCreator } from "zustand";
import {
	createRemoteActivity,
	createRemoteEntity,
	deleteRemoteEntity,
	updateRemoteEntity,
} from "../remote-store";
import {
	entityNameOf,
	generateEntry,
	pushLog,
	remoteErrorMessage,
} from "./helpers";
import { FREE_CREATION_LIMIT, isCreationLimitReached } from "./sync-slice";
import type { RPGState, Session } from "./types";

export const sessionDefaults: Omit<Session, "id" | "createdAt"> = {
	title: "",
	number: 1,
	date: "",
	inGameDate: "",
	duration: "",
	location: "",
	attendees: "",
	npcsPresent: "",
	locationsVisited: "",
	summary: "",
	keyEvents: "",
	combatLog: "",
	loot: "",
	xpAwarded: "",
	cliffhanger: "",
	dmNotes: "",
	mood: "",
	entityLinks: [],
};

export interface SessionSlice {
	sessions: Session[];
	addSession: (session: Partial<Omit<Session, "id" | "createdAt">>) => Session;
	updateSession: (id: string, session: Partial<Session>) => void;
	removeSession: (id: string) => void;
}

export const createSessionSlice: StateCreator<
	RPGState,
	[],
	[],
	SessionSlice
> = (set, get) => ({
	sessions: [],
	addSession: (session) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para adicionar sessão." });
			return {} as Session;
		}
		if (isCreationLimitReached(get())) {
			set({
				syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.`,
			});
			return {} as Session;
		}
		const created = generateEntry(sessionDefaults, session) as Session;
		const log = {
			action: "create" as const,
			entityKind: "session" as const,
			entityId: created.id,
			entityName: entityNameOf(created),
		};
		const originalSessions = get().sessions;
		const originalCount = get().globalRecordsCount;
		set((state) => ({
			sessions: [...state.sessions, created],
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: state.globalRecordsCount + 1,
			syncError: null,
		}));
		void Promise.all([
			createRemoteEntity("session", created, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				sessions: originalSessions,
				globalRecordsCount: originalCount,
				activityLog: state.activityLog.filter((l) => l.entityId !== created.id),
				syncError: remoteErrorMessage(error),
			}));
		});
		return created;
	},
	updateSession: (id, session) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para atualizar sessão." });
			return;
		}
		const originalSessions = get().sessions;
		const existing = originalSessions.find((s) => s.id === id);
		if (!existing) return;
		const updated = { ...existing, ...session, updatedAt: Date.now() };
		const log = {
			action: "update" as const,
			entityKind: "session" as const,
			entityId: id,
			entityName: entityNameOf(updated),
		};
		set((state) => ({
			sessions: state.sessions.map((s) => (s.id === id ? updated : s)),
			activityLog: pushLog(state.activityLog, log),
			syncError: null,
		}));
		void Promise.all([
			updateRemoteEntity("session", updated, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				sessions: originalSessions,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "update"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},
	removeSession: (id) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para remover sessão." });
			return;
		}
		const originalSessions = get().sessions;
		const existing = originalSessions.find((s) => s.id === id);
		if (!existing) return;
		const log = {
			action: "delete" as const,
			entityKind: "session" as const,
			entityId: id,
			entityName: entityNameOf(existing),
		};
		const originalCount = get().globalRecordsCount;
		set((state) => ({
			sessions: state.sessions.filter((s) => s.id !== id),
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: Math.max(0, state.globalRecordsCount - 1),
			syncError: null,
		}));
		void Promise.all([
			deleteRemoteEntity("session", id),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				sessions: originalSessions,
				globalRecordsCount: originalCount,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "delete"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},
});
