import type { TablesInsert, TablesUpdate } from "./database.types";
import type {
	Faction,
	FactionReputation,
	FactionReputationStatus,
	NewsComment,
	WorldNews,
} from "./store/types";
import { getSupabase } from "./supabase";

function requireSupabase() {
	const supabase = getSupabase();
	if (!supabase) {
		throw new Error("Supabase não está configurado.");
	}
	return supabase;
}

function toTimestamp(value?: string | null): number | undefined {
	if (!value) return undefined;
	const timestamp = Date.parse(value);
	return Number.isNaN(timestamp) ? undefined : timestamp;
}

function authorIdOrNull(authorId: string | undefined | null): string | null {
	if (!authorId || authorId.trim() === "") return null;
	return authorId;
}

export interface WorldbuildingSnapshot {
	factions: Faction[];
	factionReputations: FactionReputation[];
	worldNews: WorldNews[];
}

export async function loadWorldbuildingState(
	worldId: string,
): Promise<WorldbuildingSnapshot> {
	const db = requireSupabase();

	const factionsRes = await db
		.from("factions")
		.select("*")
		.eq("world_id", worldId)
		.order("updated_at", { ascending: false });
	if (factionsRes.error) throw factionsRes.error;

	const newsRes = await db
		.from("world_news")
		.select("*")
		.eq("world_id", worldId)
		.order("created_at", { ascending: false });
	if (newsRes.error) throw newsRes.error;

	const factions: Faction[] = (factionsRes.data ?? []).map((row) => ({
		id: row.id,
		worldId: row.world_id,
		name: row.name,
		leader: row.leader,
		seat: row.seat,
		goals: row.goals,
		alignment: row.alignment,
		influence: row.influence,
		description: row.description,
		imageUrl: row.image_url,
		createdAt: toTimestamp(row.created_at) ?? Date.now(),
		updatedAt: toTimestamp(row.updated_at),
	}));

	const factionIds = factions.map((f) => f.id);
	let reputationsData: Array<{
		id: string;
		faction_id: string;
		campaign_id: string;
		status: string;
		created_at: string;
		updated_at: string;
	}> = [];

	if (factionIds.length > 0) {
		const reputationsRes = await db
			.from("faction_reputations")
			.select("*")
			.in("faction_id", factionIds);
		if (reputationsRes.error) throw reputationsRes.error;
		reputationsData = reputationsRes.data ?? [];
	}

	const factionReputations: FactionReputation[] = reputationsData.map(
		(row) => ({
			id: row.id,
			factionId: row.faction_id,
			campaignId: row.campaign_id,
			status: row.status as FactionReputationStatus,
			createdAt: toTimestamp(row.created_at) ?? Date.now(),
			updatedAt: toTimestamp(row.updated_at),
		}),
	);

	const worldNews: WorldNews[] = (newsRes.data ?? []).map((row) => ({
		id: row.id,
		worldId: row.world_id,
		authorId: row.author_id ?? "",
		title: row.title,
		body: row.body,
		category: row.category,
		audience: row.audience as WorldNews["audience"],
		campaignIds: row.campaign_ids ?? [],
		visibility: row.visibility as WorldNews["visibility"],
		commentsLocked: row.comments_locked,
		createdAt: toTimestamp(row.created_at) ?? Date.now(),
		updatedAt: toTimestamp(row.updated_at),
	}));

	return { factions, factionReputations, worldNews };
}

export async function fetchCampaignWorldId(
	campaignId: string,
): Promise<string | null> {
	const supabase = getSupabase();
	if (!supabase) return null;
	const { data, error } = await supabase
		.from("campaigns")
		.select("world_id")
		.eq("id", campaignId)
		.maybeSingle();
	if (error) throw error;
	return data?.world_id ?? null;
}

export async function createRemoteFaction(faction: Faction): Promise<Faction> {
	const row: TablesInsert<"factions"> = {
		id: faction.id,
		world_id: faction.worldId,
		name: faction.name,
		leader: faction.leader,
		seat: faction.seat,
		goals: faction.goals,
		alignment: faction.alignment,
		influence: faction.influence,
		description: faction.description,
		image_url: faction.imageUrl,
	};
	const { error } = await requireSupabase().from("factions").insert(row);
	if (error) throw error;
	return faction;
}

export async function updateRemoteFaction(
	id: string,
	patch: Partial<Faction>,
): Promise<void> {
	const row: TablesUpdate<"factions"> = {};
	if (patch.name !== undefined) row.name = patch.name;
	if (patch.leader !== undefined) row.leader = patch.leader;
	if (patch.seat !== undefined) row.seat = patch.seat;
	if (patch.goals !== undefined) row.goals = patch.goals;
	if (patch.alignment !== undefined) row.alignment = patch.alignment;
	if (patch.influence !== undefined) row.influence = patch.influence;
	if (patch.description !== undefined) row.description = patch.description;
	if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl;
	const { error } = await requireSupabase()
		.from("factions")
		.update(row)
		.eq("id", id);
	if (error) throw error;
}

export async function deleteRemoteFaction(id: string): Promise<void> {
	const { error } = await requireSupabase()
		.from("factions")
		.delete()
		.eq("id", id);
	if (error) throw error;
}

export async function updateRemoteFactionReputation(
	factionId: string,
	campaignId: string,
	status: FactionReputationStatus,
): Promise<void> {
	const { error } = await requireSupabase().from("faction_reputations").upsert(
		{
			faction_id: factionId,
			campaign_id: campaignId,
			status,
		},
		{ onConflict: "faction_id,campaign_id" },
	);
	if (error) throw error;
}

export async function createRemoteWorldNews(
	news: WorldNews,
): Promise<WorldNews> {
	const row: TablesInsert<"world_news"> = {
		id: news.id,
		world_id: news.worldId,
		author_id: authorIdOrNull(news.authorId),
		title: news.title,
		body: news.body,
		category: news.category,
		audience: news.audience,
		campaign_ids: news.campaignIds,
		visibility: news.visibility,
		comments_locked: news.commentsLocked,
	};
	const { error } = await requireSupabase().from("world_news").insert(row);
	if (error) throw error;
	return news;
}

export async function updateRemoteWorldNews(
	id: string,
	patch: Partial<WorldNews>,
): Promise<void> {
	const row: TablesUpdate<"world_news"> = {};
	if (patch.title !== undefined) row.title = patch.title;
	if (patch.body !== undefined) row.body = patch.body;
	if (patch.category !== undefined) row.category = patch.category;
	if (patch.audience !== undefined) row.audience = patch.audience;
	if (patch.campaignIds !== undefined) row.campaign_ids = patch.campaignIds;
	if (patch.visibility !== undefined) row.visibility = patch.visibility;
	if (patch.commentsLocked !== undefined) {
		row.comments_locked = patch.commentsLocked;
	}
	const { error } = await requireSupabase()
		.from("world_news")
		.update(row)
		.eq("id", id);
	if (error) throw error;
}

export async function deleteRemoteWorldNews(id: string): Promise<void> {
	const { error } = await requireSupabase()
		.from("world_news")
		.delete()
		.eq("id", id);
	if (error) throw error;
}

export async function loadRemoteNewsComments(
	newsId: string,
): Promise<NewsComment[]> {
	const { data, error } = await requireSupabase()
		.from("news_comments")
		.select("*")
		.eq("news_id", newsId)
		.order("created_at", { ascending: true });
	if (error) throw error;
	return (data ?? []).map((row) => ({
		id: row.id,
		newsId: row.news_id,
		authorId: row.author_id ?? "",
		parentId: row.parent_id,
		body: row.body,
		createdAt: toTimestamp(row.created_at) ?? Date.now(),
		updatedAt: toTimestamp(row.updated_at),
	}));
}

export async function createRemoteNewsComment(
	comment: NewsComment,
): Promise<NewsComment> {
	const row: TablesInsert<"news_comments"> = {
		id: comment.id,
		news_id: comment.newsId,
		author_id: authorIdOrNull(comment.authorId),
		parent_id: comment.parentId,
		body: comment.body,
	};
	const { error } = await requireSupabase().from("news_comments").insert(row);
	if (error) throw error;
	return comment;
}

export async function updateRemoteNewsComment(
	id: string,
	body: string,
): Promise<void> {
	const { error } = await requireSupabase()
		.from("news_comments")
		.update({ body })
		.eq("id", id);
	if (error) throw error;
}

export async function deleteRemoteNewsComment(id: string): Promise<void> {
	const { error } = await requireSupabase()
		.from("news_comments")
		.delete()
		.eq("id", id);
	if (error) throw error;
}

export async function countNewsComments(newsId: string): Promise<number> {
	const { count, error } = await requireSupabase()
		.from("news_comments")
		.select("*", { count: "exact", head: true })
		.eq("news_id", newsId);
	if (error) throw error;
	return count ?? 0;
}

export async function loadFactionReputationsForFaction(
	factionId: string,
): Promise<FactionReputation[]> {
	const { data, error } = await requireSupabase()
		.from("faction_reputations")
		.select("*")
		.eq("faction_id", factionId);
	if (error) throw error;
	return (data ?? []).map((row) => ({
		id: row.id,
		factionId: row.faction_id,
		campaignId: row.campaign_id,
		status: row.status as FactionReputationStatus,
		createdAt: toTimestamp(row.created_at) ?? Date.now(),
		updatedAt: toTimestamp(row.updated_at),
	}));
}
