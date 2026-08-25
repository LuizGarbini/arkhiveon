export * from "./core";
export * from "./relations";
export * from "./sheets";
export * from "./vtt";
export * from "./worldbuilding";

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type * as core from "./core";
import type * as sheets from "./sheets";
import type * as vtt from "./vtt";
import type * as worldbuilding from "./worldbuilding";

// Inferred TypeScript Model Types
export type World = InferSelectModel<typeof core.worlds>;
export type NewWorld = InferInsertModel<typeof core.worlds>;

export type Campaign = InferSelectModel<typeof core.campaigns>;
export type NewCampaign = InferInsertModel<typeof core.campaigns>;

export type Membership = InferSelectModel<typeof core.memberships>;
export type NewMembership = InferInsertModel<typeof core.memberships>;

export type Invite = InferSelectModel<typeof core.invites>;
export type NewInvite = InferInsertModel<typeof core.invites>;

export type UserPlan = InferSelectModel<typeof core.userPlans>;
export type NewUserPlan = InferInsertModel<typeof core.userPlans>;

export type ActivityLog = InferSelectModel<typeof core.activityLog>;
export type NewActivityLog = InferInsertModel<typeof core.activityLog>;

export type ImageAsset = InferSelectModel<typeof core.imageAssets>;
export type NewImageAsset = InferInsertModel<typeof core.imageAssets>;

export type Character = InferSelectModel<typeof sheets.characters>;
export type NewCharacter = InferInsertModel<typeof sheets.characters>;

export type CustomTemplate = InferSelectModel<typeof sheets.customTemplates>;
export type NewCustomTemplate = InferInsertModel<typeof sheets.customTemplates>;

export type Spell = InferSelectModel<typeof sheets.spells>;
export type NewSpell = InferInsertModel<typeof sheets.spells>;

export type Feat = InferSelectModel<typeof sheets.feats>;
export type NewFeat = InferInsertModel<typeof sheets.feats>;

export type Faction = InferSelectModel<typeof worldbuilding.factions>;
export type NewFaction = InferInsertModel<typeof worldbuilding.factions>;

export type FactionReputation = InferSelectModel<
	typeof worldbuilding.factionReputations
>;
export type NewFactionReputation = InferInsertModel<
	typeof worldbuilding.factionReputations
>;

export type Location = InferSelectModel<typeof worldbuilding.locations>;
export type NewLocation = InferInsertModel<typeof worldbuilding.locations>;

export type NPC = InferSelectModel<typeof worldbuilding.npcs>;
export type NewNPC = InferInsertModel<typeof worldbuilding.npcs>;

export type Item = InferSelectModel<typeof worldbuilding.items>;
export type NewItem = InferInsertModel<typeof worldbuilding.items>;

export type Lore = InferSelectModel<typeof worldbuilding.lores>;
export type NewLore = InferInsertModel<typeof worldbuilding.lores>;

export type Session = InferSelectModel<typeof worldbuilding.sessions>;
export type NewSession = InferInsertModel<typeof worldbuilding.sessions>;

export type WorldNews = InferSelectModel<typeof worldbuilding.worldNews>;
export type NewWorldNews = InferInsertModel<typeof worldbuilding.worldNews>;

export type NewsComment = InferSelectModel<typeof worldbuilding.newsComments>;
export type NewNewsComment = InferInsertModel<
	typeof worldbuilding.newsComments
>;

export type VTTScene = InferSelectModel<typeof vtt.vttScenes>;
export type NewVTTScene = InferInsertModel<typeof vtt.vttScenes>;

export type VTTToken = InferSelectModel<typeof vtt.vttTokens>;
export type NewVTTToken = InferInsertModel<typeof vtt.vttTokens>;

export type VTTFogState = InferSelectModel<typeof vtt.vttFogStates>;
export type NewVTTFogState = InferInsertModel<typeof vtt.vttFogStates>;
