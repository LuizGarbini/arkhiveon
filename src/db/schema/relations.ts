import { relations } from "drizzle-orm";
import {
	activityLog,
	campaigns,
	imageAssets,
	invites,
	memberships,
	worlds,
} from "./core";
import { characters, customTemplates } from "./sheets";
import { vttFogStates, vttScenes, vttTokens } from "./vtt";
import {
	factionReputations,
	factions,
	items,
	locations,
	lores,
	newsComments,
	npcs,
	sessions,
	worldNews,
} from "./worldbuilding";

// 1. Worlds Relations
export const worldsRelations = relations(worlds, ({ many }) => ({
	campaigns: many(campaigns),
	factions: many(factions),
	locations: many(locations),
	npcs: many(npcs),
	items: many(items),
	lores: many(lores),
	worldNews: many(worldNews),
}));

// 2. Campaigns Relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
	world: one(worlds, {
		fields: [campaigns.worldId],
		references: [worlds.id],
	}),
	memberships: many(memberships),
	invites: many(invites),
	characters: many(characters),
	customTemplates: many(customTemplates),
	factionReputations: many(factionReputations),
	sessions: many(sessions),
	activityLog: many(activityLog),
	imageAssets: many(imageAssets),
	vttScenes: many(vttScenes),
}));

// 3. Memberships Relations
export const membershipsRelations = relations(memberships, ({ one }) => ({
	campaign: one(campaigns, {
		fields: [memberships.campaignId],
		references: [campaigns.id],
	}),
}));

// 4. Invites Relations
export const invitesRelations = relations(invites, ({ one }) => ({
	campaign: one(campaigns, {
		fields: [invites.campaignId],
		references: [campaigns.id],
	}),
}));

// 5. Activity Log Relations
export const activityLogRelations = relations(activityLog, ({ one }) => ({
	campaign: one(campaigns, {
		fields: [activityLog.campaignId],
		references: [campaigns.id],
	}),
}));

// 6. Image Assets Relations
export const imageAssetsRelations = relations(imageAssets, ({ one }) => ({
	campaign: one(campaigns, {
		fields: [imageAssets.campaignId],
		references: [campaigns.id],
	}),
}));

// 7. Characters Relations
export const charactersRelations = relations(characters, ({ one, many }) => ({
	campaign: one(campaigns, {
		fields: [characters.campaignId],
		references: [campaigns.id],
	}),
	vttTokens: many(vttTokens),
}));

// 8. Custom Templates Relations
export const customTemplatesRelations = relations(
	customTemplates,
	({ one }) => ({
		campaign: one(campaigns, {
			fields: [customTemplates.campaignId],
			references: [campaigns.id],
		}),
	}),
);

// 9. Factions Relations
export const factionsRelations = relations(factions, ({ one, many }) => ({
	world: one(worlds, {
		fields: [factions.worldId],
		references: [worlds.id],
	}),
	reputations: many(factionReputations),
}));

// 10. Faction Reputations Relations
export const factionReputationsRelations = relations(
	factionReputations,
	({ one }) => ({
		campaign: one(campaigns, {
			fields: [factionReputations.campaignId],
			references: [campaigns.id],
		}),
		faction: one(factions, {
			fields: [factionReputations.factionId],
			references: [factions.id],
		}),
	}),
);

// 11. Locations Relations
export const locationsRelations = relations(locations, ({ one }) => ({
	world: one(worlds, {
		fields: [locations.worldId],
		references: [worlds.id],
	}),
	campaign: one(campaigns, {
		fields: [locations.campaignId],
		references: [campaigns.id],
	}),
}));

// 12. NPCs Relations
export const npcsRelations = relations(npcs, ({ one }) => ({
	world: one(worlds, {
		fields: [npcs.worldId],
		references: [worlds.id],
	}),
	campaign: one(campaigns, {
		fields: [npcs.campaignId],
		references: [campaigns.id],
	}),
}));

// 13. Items Relations
export const itemsRelations = relations(items, ({ one }) => ({
	world: one(worlds, {
		fields: [items.worldId],
		references: [worlds.id],
	}),
	campaign: one(campaigns, {
		fields: [items.campaignId],
		references: [campaigns.id],
	}),
}));

// 14. Lores Relations
export const loresRelations = relations(lores, ({ one }) => ({
	world: one(worlds, {
		fields: [lores.worldId],
		references: [worlds.id],
	}),
	campaign: one(campaigns, {
		fields: [lores.campaignId],
		references: [campaigns.id],
	}),
}));

// 15. Sessions Relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
	campaign: one(campaigns, {
		fields: [sessions.campaignId],
		references: [campaigns.id],
	}),
}));

// 16. World News Relations
export const worldNewsRelations = relations(worldNews, ({ one, many }) => ({
	world: one(worlds, {
		fields: [worldNews.worldId],
		references: [worlds.id],
	}),
	comments: many(newsComments),
}));

// 17. News Comments Relations
export const newsCommentsRelations = relations(newsComments, ({ one }) => ({
	news: one(worldNews, {
		fields: [newsComments.newsId],
		references: [worldNews.id],
	}),
	parent: one(newsComments, {
		fields: [newsComments.parentId],
		references: [newsComments.id],
	}),
}));

// 18. VTT Scenes Relations
export const vttScenesRelations = relations(vttScenes, ({ one, many }) => ({
	campaign: one(campaigns, {
		fields: [vttScenes.campaignId],
		references: [campaigns.id],
	}),
	tokens: many(vttTokens),
	fogState: one(vttFogStates),
}));

// 19. VTT Tokens Relations
export const vttTokensRelations = relations(vttTokens, ({ one }) => ({
	scene: one(vttScenes, {
		fields: [vttTokens.sceneId],
		references: [vttScenes.id],
	}),
	character: one(characters, {
		fields: [vttTokens.characterId],
		references: [characters.id],
	}),
}));

// 20. VTT Fog States Relations
export const vttFogStatesRelations = relations(vttFogStates, ({ one }) => ({
	scene: one(vttScenes, {
		fields: [vttFogStates.sceneId],
		references: [vttScenes.id],
	}),
}));
