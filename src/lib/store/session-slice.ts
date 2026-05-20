import type { StateCreator } from "zustand";
import type { Session, RPGState } from "./types";
import { generateEntry, pushLog, entityNameOf, remoteErrorMessage } from "./helpers";
import { createRemoteEntity, createRemoteActivity, updateRemoteEntity, deleteRemoteEntity } from "../remote-store";
import { FREE_CREATION_LIMIT, isCreationLimitReached } from "./sync-slice";

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

export const createSessionSlice: StateCreator<RPGState, [], [], SessionSlice> = (set, get) => ({
	sessions: [],
	addSession: (session) => {
		if (isCreationLimitReached(get())) {
			set({ syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.` });
			return {} as Session;
		}
		const created = generateEntry(sessionDefaults, session) as Session;
		const log = {
			action: "create" as const,
			entityKind: "session" as const,
			entityId: created.id,
			entityName: entityNameOf(created),
		};
		set((state) => ({
			sessions: [...state.sessions, created],
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: state.globalRecordsCount + 1,
			syncError: null,
		}));
		const campaignId = get().activeCampaignId!;
		void Promise.all([
			createRemoteEntity("session", created, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
		return created;
	},
	updateSession: (id, session) =>
		set((state) => {
			const existing = state.sessions.find((s) => s.id === id);
			if (!existing) return state;
			const updated = { ...existing, ...session, updatedAt: Date.now() };
			const log = {
				action: "update" as const,
				entityKind: "session" as const,
				entityId: id,
				entityName: entityNameOf(updated),
			};
			void Promise.all([
				updateRemoteEntity("session", updated, get().activeCampaignId!),
				createRemoteActivity(log, get().activeCampaignId!),
			]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
			return {
				sessions: state.sessions.map((s) => (s.id === id ? updated : s)),
				activityLog: pushLog(state.activityLog, log),
				syncError: null,
			};
		}),
	removeSession: (id) =>
		set((state) => {
			const existing = state.sessions.find((s) => s.id === id);
			if (existing) {
				const log = {
					action: "delete" as const,
					entityKind: "session" as const,
					entityId: id,
					entityName: entityNameOf(existing),
				};
				void Promise.all([
					deleteRemoteEntity("session", id),
					createRemoteActivity(log, get().activeCampaignId!),
				]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
				return {
					sessions: state.sessions.filter((s) => s.id !== id),
					activityLog: pushLog(state.activityLog, log),
					globalRecordsCount: Math.max(0, state.globalRecordsCount - 1),
					syncError: null,
				};
			}
			return state;
		}),
});
