import type { UserPlan } from "../user-plan";
export type { UserPlan };

// =====================================================
//  Sistemas suportados
// =====================================================
export const RPG_SYSTEMS = [
	{ value: "dnd5e", label: "D&D 5ª Edição (2014)" },
	{ value: "dnd2024", label: "D&D 2024" },
	{ value: "dnd35", label: "D&D 3.5" },
	{ value: "vampire", label: "Vampiro: A Máscara" },
	{ value: "coc", label: "Call of Cthulhu 7e" },
	{ value: "tormenta20", label: "Tormenta 20" },
	{ value: "ordem", label: "Ordem Paranormal" },
	{ value: "contosloop", label: "Contos do Loop" },
	{ value: "mausritter", label: "Mausritter" },
	{ value: "daggerheart", label: "Daggerheart" },
	{ value: "cyberpunkred", label: "Cyberpunk RED" },
	{ value: "fallout2d20", label: "Fallout RPG (2d20)" },
	{ value: "wilderfeast", label: "Wilderfeast" },
	{ value: "gothrpg", label: "Guerra dos Tronos RPG" },
	{ value: "cosmere", label: "Cosmere RPG" },
	{ value: "hogwarts", label: "Hogwarts: Um RPG (PbtA)" },
	{ value: "avatarlegends", label: "Avatar Legends" },
	{ value: "3det", label: "3DeT Victory" },
	{ value: "assassinscreed", label: "Assassin's Creed RPG" },
	{ value: "corespring", label: "Corespring RPG" },
	{ value: "corespringnpc", label: "Corespring — Ameaça (NPC)" },
	{ value: "melodiaperdida", label: "Melodia Perdida" },
	{ value: "olddragon2e", label: "Old Dragon 2e" },
	{ value: "skyfall", label: "Skyfall RPG" },
	{ value: "symbaroum", label: "Symbaroum" },
	{ value: "ronin", label: "Ronin RPG (Puro Osso)" },
	{ value: "duna", label: "Duna: Aventuras no Imperium" },
	{ value: "stalker", label: "STALKER RPG 2ª Edição" },
	{ value: "fissura", label: "Fissura RPG" },
	{ value: "meltedlands", label: "Melted Lands" },
	{ value: "savageworlds", label: "Savage Worlds SWADE" },
	{ value: "sacramento", label: "Sacramento RPG" },
	{ value: "somdasseis", label: "O Som das Seis" },
	{ value: "fabulaultima", label: "Fabula Ultima" },
	{ value: "ashesoftomorrow", label: "Ashes of Tomorrow" },
	{ value: "l5r5e", label: "Legend of the Five Rings 5e" },
	{ value: "weirdwizard", label: "Shadow of the Weird Wizard" },
	{ value: "demonlord", label: "Shadow of the Demon Lord" },
	{ value: "pathfinder", label: "Pathfinder 2e" },
	{ value: "generic", label: "Genérico / Outro" },
] as const;

export type RpgSystem =
	| (typeof RPG_SYSTEMS)[number]["value"]
	| `custom_${string}`;

// =====================================================
//  Templates Customizados
// =====================================================
export type FieldType =
	| "text"
	| "number"
	| "textarea"
	| "attribute_box"
	| "metric_box"
	| "image"
	| "checkbox";

export interface TemplateField {
	id: string; // ID único do campo (ex: 'str', 'hp_max')
	type: FieldType;
	label: string;
	placeholder?: string;
	width?: "full" | "half" | "third" | "quarter"; // Para organização no grid
}

export interface TemplateSection {
	id: string;
	title: string;
	fields: TemplateField[];
}

export interface CustomTemplate {
	id: string;
	name: string;
	description: string;
	author: string;
	createdAt: number;
	/** Sistema base usado pelos campos e atributos da ficha */
	baseSystem: RpgSystem;
	/** Layout modular salvo (blocos, ordem e colunas) */
	sheetLayout: SheetLayoutConfig;
	/** Legado — construtor antigo de campos; ignorado nos layouts salvos */
	sections?: TemplateSection[];
}

// =====================================================
//  Tipos de entidade
// =====================================================
export type EntityKind =
	| "character"
	| "npc"
	| "session"
	| "item"
	| "location"
	| "lore"
	| "customTemplate";

export const ENTITY_LABELS: Record<
	EntityKind,
	{ singular: string; plural: string }
> = {
	character: { singular: "Personagem", plural: "Personagens" },
	npc: { singular: "NPC", plural: "NPCs" },
	session: { singular: "Sessão", plural: "Sessões" },
	item: { singular: "Item", plural: "Itens" },
	location: { singular: "Local", plural: "Locais" },
	lore: { singular: "Lore", plural: "Lore" },
	customTemplate: { singular: "Layout salvo", plural: "Layouts salvos" },
};

// =====================================================
//  Activity log
// =====================================================
export type ActivityAction = "create" | "update" | "delete";

export interface ActivityEntry {
	id: string;
	timestamp: number;
	action: ActivityAction;
	entityKind: EntityKind;
	entityId: string;
	entityName: string;
}

export interface AppNotification {
	id: string;
	variant: "success" | "error" | "info";
	title: string;
	description?: string;
	createdAt: number;
	read: boolean;
}

export interface EntityLink {
	id: string;
	entityKind: EntityKind;
	entityId: string;
	label?: string;
	note?: string;
}

// =====================================================
//  Interfaces das Entidades
// =====================================================
export interface Character {
	id: string;
	createdAt: number;
	updatedAt?: number;
	system: RpgSystem;
	characterName: string;
	playerName: string;
	race: string;
	class: string;
	subclass: string;
	background: string;
	alignment: string;
	level: number;
	xp: number;
	age: string;
	height: string;
	weight: string;
	eyes: string;
	hair: string;
	skin: string;
	appearance: string;
	strength: number;
	dexterity: number;
	constitution: number;
	intelligence: number;
	wisdom: number;
	charisma: number;
	power: number;
	size: number;
	education: number;
	sanity: number;
	sanityMax: number;
	health: number;
	healthMax: number;
	tempHealth: number;
	armorClass: number;
	initiative: number;
	speed: number;
	proficiencyBonus: number;
	hitDice: string;
	deathSaves: { successes: number; failures: number };
	savingThrows: string;
	skills: string;
	languages: string;
	proficiencies: string;
	spellcastingClass: string;
	spellAbility: string;
	spellSaveDc: number;
	spellAttackBonus: number;
	spells: string;
	spellSlots: string;
	equipment: string;
	currency: string;
	personalityTraits: string;
	ideals: string;
	bonds: string;
	flaws: string;
	notes: string;
	imageUrl: string;
	imageAssetId?: string;
	imageFocusX?: number;
	imageFocusY?: number;
	imageZoom?: number;
	sheetLayout: SheetLayoutConfig;
	familyRelations: FamilyRelation[];
	entityLinks: EntityLink[];
	systemAttributes?: Record<string, number>;
	systemFields?: Record<string, string>;
	customFields?: Record<string, unknown>;
	effort?: number;
	effortMax?: number;
	customTemplateId?: string;
	spellsList?: Spell[];
	featsList?: Feat[];
}

export interface Spell {
	id: string;
	user_id?: string | null;
	system: string;
	name: string;
	level: number;
	school: string;
	casting_time: string;
	range: string;
	components: string;
	duration: string;
	description: string;
	is_homebrew?: boolean;
}

export interface Feat {
	id: string;
	user_id?: string | null;
	system: string;
	name: string;
	category: string;
	prerequisites: string;
	description: string;
	ability_increase: string;
	source: string;
	is_homebrew?: boolean;
}

export type FamilyRelationKind =
	| "father"
	| "mother"
	| "parent"
	| "guardian"
	| "sibling"
	| "child"
	| "spouse"
	| "partner"
	| "relative";

export interface FamilyRelation {
	id: string;
	relatedCharacterId: string;
	kind: FamilyRelationKind;
	note?: string;
	isSecret?: boolean;
}

export type SheetModuleKind =
	| "identity"
	| "abilities"
	| "combat"
	| "sanity"
	| "magic"
	| "feats"
	| "inventory"
	| "personality"
	| "notes"
	| "customText"
	| "customStats"
	| "custom_template_fields";

export interface SheetModuleConfig {
	id: string;
	kind: SheetModuleKind;
	title: string;
	enabled: boolean;
	order: number;
	column?: "main" | "side";
	fields?: string[];
	content?: string;
}

export interface SheetLayoutConfig {
	version: 1;
	template: RpgSystem | "custom";
	modules: SheetModuleConfig[];
}

export type PublicationScope = "global" | "restricted";
export type EntityVisibility = "public" | "master_secret";
export type FactionReputationStatus =
	| "ally"
	| "neutral"
	| "hostile"
	| "unfriendly";

export interface WorldEntityFields {
	worldId: string;
	publicationScope: PublicationScope;
	campaignIds: string[];
	visibility: EntityVisibility;
}

export interface Npc extends WorldEntityFields {
	id: string;
	createdAt: number;
	updatedAt?: number;
	kind: "npc" | "monster";
	name: string;
	race: string;
	role: string;
	location: string;
	faction: string;
	alignment: string;
	disposition: string;
	importance: "minor" | "supporting" | "major" | "boss" | "unknown";
	cr: string;
	appearance: string;
	mannerisms: string;
	motivations: string;
	secrets: string;
	relationships: string;
	stats: string;
	description: string;
	imageUrl: string;
	isAlive: boolean;
	linkedCharacterId: string;
	entityLinks: EntityLink[];
}

export interface Session {
	id: string;
	createdAt: number;
	updatedAt?: number;
	title: string;
	number: number;
	date: string;
	inGameDate: string;
	duration: string;
	location: string;
	attendees: string;
	npcsPresent: string;
	locationsVisited: string;
	summary: string;
	keyEvents: string;
	combatLog: string;
	loot: string;
	xpAwarded: string;
	cliffhanger: string;
	dmNotes: string;
	mood: string;
	entityLinks: EntityLink[];
}

export interface Item extends WorldEntityFields {
	id: string;
	createdAt: number;
	updatedAt?: number;
	/** Dono do registro (auth user) — viewers só editam o próprio. */
	createdBy?: string;
	name: string;
	type: string;
	rarity: string;
	subtype: string;
	weight: string;
	value: string;
	requiresAttunement: boolean;
	attunedTo: string;
	charges: string;
	source: string;
	stats: string;
	properties: string;
	description: string;
	owner: string;
	imageUrl: string;
	imageAssetId?: string;
	imageFocusX?: number;
	imageFocusY?: number;
	imageZoom?: number;
	equipped: boolean;
	entityLinks: EntityLink[];
}

export interface GameLocation extends WorldEntityFields {
	id: string;
	createdAt: number;
	updatedAt?: number;
	name: string;
	type: string;
	region: string;
	parentLocation: string;
	dangerLevel: string;
	climate: string;
	terrain: string;
	population: string;
	government: string;
	economy: string;
	notableInhabitants: string;
	keyFeatures: string;
	hooks: string;
	history: string;
	description: string;
	imageUrl: string;
	mapUrl: string;
	visited: boolean;
	entityLinks: EntityLink[];
}

export interface Lore extends WorldEntityFields {
	id: string;
	createdAt: number;
	updatedAt?: number;
	title: string;
	category: string;
	era: string;
	importance: "minor" | "supporting" | "major" | "core";
	tags: string;
	relatedEntities: string;
	source: string;
	knownBy: string;
	content: string;
	notes: string;
	isSecret: boolean;
	imageUrl: string;
	entityLinks: EntityLink[];
}

// =====================================================
//  Campanha + Memberships
// =====================================================
export type MembershipRole = "owner" | "editor" | "viewer";

export interface Membership {
	id: string;
	campaignId: string;
	userId: string;
	role: MembershipRole;
	createdAt: number;
}

export type InviteStatus = "pending" | "accepted" | "declined" | "expired";

export interface Invite {
	id: string;
	campaignId: string;
	email: string;
	role: "editor" | "viewer";
	status: InviteStatus;
	invitedBy: string;
	createdAt: number;
	campaignName?: string;
}

export interface World {
	id: string;
	name: string;
	isDefault: boolean;
	ownerUserId: string;
	createdAt: number;
	updatedAt?: number;
}

export interface Campaign {
	id: string;
	name: string;
	description: string;
	ownerId: string;
	worldId: string;
	system?: RpgSystem;
	myRole?: MembershipRole;
	createdAt: number;
	updatedAt?: number;
}

export interface Faction {
	id: string;
	worldId: string;
	name: string;
	leader: string;
	seat: string;
	goals: string;
	alignment: string;
	influence: string;
	description: string;
	imageUrl: string;
	createdAt: number;
	updatedAt?: number;
}

export interface FactionReputation {
	id: string;
	factionId: string;
	campaignId: string;
	status: FactionReputationStatus;
	createdAt: number;
	updatedAt?: number;
}

export interface WorldNews {
	id: string;
	worldId: string;
	authorId: string;
	title: string;
	body: string;
	category: string;
	audience: PublicationScope;
	campaignIds: string[];
	visibility: EntityVisibility;
	commentsLocked: boolean;
	createdAt: number;
	updatedAt?: number;
	commentCount?: number;
}

export interface NewsComment {
	id: string;
	newsId: string;
	authorId: string;
	parentId: string | null;
	body: string;
	createdAt: number;
	updatedAt?: number;
}

export interface ImageAsset {
	id: string;
	campaignId: string;
	createdBy: string;
	name: string;
	url: string;
	storageKey?: string;
	mimeType: string;
	sizeBytes: number;
	width?: number;
	height?: number;
	isPrivate: boolean;
	createdAt: number;
	updatedAt?: number;
}

// =====================================================
//  Store State Interface
// =====================================================
export interface RPGState {
	isLoadingRemote: boolean;
	syncError: string | null;
	loadRemoteData: () => Promise<void>;
	setupRealtime: () => () => void;
	clearLocalData: () => void;
	clearActiveCampaignEntities: () => void;

	// ----- Plan Limits -----
	userPlan: UserPlan;
	setUserPlan: (plan: UserPlan) => void;
	globalRecordsCount: number;
	activeCampaignOwnerPlan: UserPlan;

	// ----- Campanhas -----
	campaigns: Campaign[];
	activeCampaignId: string | null;
	activeWorldId: string | null;
	hasLoadedCampaigns: boolean;
	loadCampaigns: () => Promise<void>;
	createCampaign: (
		name: string,
		description?: string,
		options?: { worldId?: string; newWorldName?: string; system?: RpgSystem },
	) => Promise<Campaign>;
	updateCampaign: (
		id: string,
		data: Partial<Pick<Campaign, "name" | "description" | "system">>,
	) => void;
	deleteCampaign: (id: string) => Promise<void>;
	switchCampaign: (id: string) => Promise<void>;
	switchWorld: (worldId: string) => Promise<void>;

	// ----- Mundos -----
	worlds: World[];
	loadWorlds: () => Promise<void>;
	createWorld: (name: string) => Promise<World>;
	updateWorld: (id: string, data: Partial<Pick<World, "name">>) => void;
	deleteWorld: (id: string) => Promise<void>;

	// ----- Convites & Membros -----
	pendingInvites: Invite[];
	loadInvites: () => Promise<void>;
	createInvite: (
		campaignId: string,
		email: string,
		role: "editor" | "viewer",
	) => Promise<void>;
	revokeInvite: (inviteId: string) => Promise<void>;
	acceptInvite: (inviteId: string) => Promise<void>;
	declineInvite: (inviteId: string) => Promise<void>;
	removeMember: (campaignId: string, userId: string) => Promise<void>;
	loadCampaignMembersAndInvites: (campaignId: string) => Promise<{
		members: Array<{
			id: string;
			userId: string;
			email: string;
			role: MembershipRole;
		}>;
		invites: Invite[];
	}>;
	resetCampaigns: () => void;

	imageAssets: ImageAsset[];
	loadImageAssets: () => Promise<void>;
	addImageAsset: (
		asset: Partial<Omit<ImageAsset, "id" | "createdAt" | "campaignId">>,
	) => ImageAsset | null;
	updateImageAsset: (
		id: string,
		asset: Partial<Pick<ImageAsset, "name" | "isPrivate">>,
	) => void;
	removeImageAsset: (id: string) => void;

	characters: Character[];
	addCharacter: (
		character: Partial<Omit<Character, "id" | "createdAt">>,
	) => Character;
	updateCharacter: (id: string, character: Partial<Character>) => void;
	removeCharacter: (id: string) => void;
	transferCharacterToCampaign: (
		id: string,
		targetCampaignId: string,
	) => Promise<Character | null>;

	customTemplates: CustomTemplate[];
	addTemplate: (template: CustomTemplate) => void;
	updateTemplate: (id: string, template: Partial<CustomTemplate>) => void;
	removeTemplate: (id: string) => void;

	npcs: Npc[];
	addNpc: (npc: Partial<Omit<Npc, "id" | "createdAt">>) => Npc | null;
	updateNpc: (id: string, npc: Partial<Npc>) => void;
	removeNpc: (id: string) => void;

	sessions: Session[];
	addSession: (session: Partial<Omit<Session, "id" | "createdAt">>) => Session;
	updateSession: (id: string, session: Partial<Session>) => void;
	removeSession: (id: string) => void;

	items: Item[];
	addItem: (
		item: Partial<Omit<Item, "id" | "createdAt">>,
		actingUserId?: string,
	) => Item;
	updateItem: (id: string, item: Partial<Item>, actingUserId?: string) => void;
	removeItem: (id: string, actingUserId?: string) => void;

	locations: GameLocation[];
	addLocation: (
		location: Partial<Omit<GameLocation, "id" | "createdAt">>,
	) => GameLocation;
	updateLocation: (id: string, location: Partial<GameLocation>) => void;
	removeLocation: (id: string) => void;

	lores: Lore[];
	addLore: (lore: Partial<Omit<Lore, "id" | "createdAt">>) => Lore;
	updateLore: (id: string, lore: Partial<Lore>) => void;
	removeLore: (id: string) => void;

	factions: Faction[];
	factionReputations: FactionReputation[];
	addFaction: (
		faction: Partial<Omit<Faction, "id" | "createdAt" | "worldId">>,
	) => Faction | null;
	updateFaction: (id: string, faction: Partial<Faction>) => void;
	removeFaction: (id: string) => void;
	updateFactionReputation: (
		factionId: string,
		campaignId: string,
		status: FactionReputationStatus,
	) => void;

	worldNews: WorldNews[];
	newsComments: NewsComment[];
	addWorldNews: (
		news: Partial<Omit<WorldNews, "id" | "createdAt" | "worldId" | "authorId">>,
	) => Promise<WorldNews | null>;
	updateWorldNews: (id: string, news: Partial<WorldNews>) => void;
	removeWorldNews: (id: string) => void;
	loadNewsComments: (newsId: string) => Promise<void>;
	addNewsComment: (
		newsId: string,
		body: string,
		parentId?: string | null,
	) => Promise<NewsComment | null>;
	updateNewsComment: (id: string, body: string) => void;
	removeNewsComment: (id: string) => void;

	activityLog: ActivityEntry[];
	clearActivity: () => void;

	// ----- Spotify Jam -----
	spotifyJamLink: string | null;
	spotifyJamActive: boolean;
	spotifyToken: string | null;
	spotifyUser: { name: string; email?: string; image?: string } | null;
	currentTrack: {
		title: string;
		artist: string;
		albumArt?: string;
		isPlaying: boolean;
	} | null;
	jamParticipants: { id: string; name: string; image?: string }[];
	setSpotifyJam: (link: string | null) => void;
	clearSpotifyJam: () => void;
	setSpotifyAuth: (
		token: string,
		user?: { name: string; email?: string; image?: string },
	) => void;
	logoutSpotify: () => void;
	setCurrentTrack: (
		track: {
			title: string;
			artist: string;
			albumArt?: string;
			isPlaying: boolean;
		} | null,
	) => void;
	setJamParticipants: (
		participants: { id: string; name: string; image?: string }[],
	) => void;

	// ----- Notifications -----
	notifications: AppNotification[];
	addNotification: (
		notification: Omit<AppNotification, "id" | "createdAt" | "read">,
	) => void;
	markAllNotificationsAsRead: () => void;
	clearNotifications: () => void;
}
