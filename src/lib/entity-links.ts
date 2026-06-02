import type {
	Character,
	EntityKind,
	EntityLink,
	GameLocation,
	Item,
	Lore,
	Npc,
	RPGState,
	Session,
} from "./store";

type EntityCollections = Pick<
	RPGState,
	"characters" | "npcs" | "sessions" | "items" | "locations" | "lores"
>;

export interface LinkableEntity {
	entityKind: EntityKind;
	entityId: string;
	name: string;
	label: string;
	path: string;
}

export interface ResolvedEntityLink extends EntityLink {
	name: string;
	kindLabel: string;
	path: string;
	missing: boolean;
}

export const ENTITY_KIND_LABELS: Record<EntityKind, string> = {
	character: "Ficha",
	npc: "NPC",
	session: "Sessão",
	item: "Item",
	location: "Local",
	lore: "Lore",
};

export function listLinkableEntities(
	state: EntityCollections,
	exclude?: { entityKind: EntityKind; entityId?: string },
): LinkableEntity[] {
	return [
		...state.characters.map((entity) =>
			toLinkableEntity("character", entity, entity.characterName, "/sheets"),
		),
		...state.npcs.map((entity) =>
			toLinkableEntity("npc", entity, entity.name, "/npcs"),
		),
		...state.sessions.map((entity) =>
			toLinkableEntity(
				"session",
				entity,
				entity.title || `Sessão #${entity.number}`,
				"/sessions",
			),
		),
		...state.items.map((entity) =>
			toLinkableEntity("item", entity, entity.name, "/items"),
		),
		...state.locations.map((entity) =>
			toLinkableEntity("location", entity, entity.name, "/locations"),
		),
		...state.lores.map((entity) =>
			toLinkableEntity("lore", entity, entity.title, "/lore"),
		),
	].filter(
		(entity) =>
			!(
				exclude &&
				entity.entityKind === exclude.entityKind &&
				entity.entityId === exclude.entityId
			),
	);
}

export function resolveEntityLinks(
	links: EntityLink[] | undefined,
	state: EntityCollections,
): ResolvedEntityLink[] {
	const entities = listLinkableEntities(state);
	return (links ?? []).map((link) => {
		const entity = entities.find(
			(item) =>
				item.entityKind === link.entityKind && item.entityId === link.entityId,
		);
		return {
			...link,
			name: entity?.name || "Entidade removida",
			kindLabel: ENTITY_KIND_LABELS[link.entityKind],
			path: entity?.path || fallbackPathFor(link.entityKind),
			missing: !entity,
		};
	});
}

export function suggestEntityLinksFromText(
	text: string,
	state: EntityCollections,
	currentLinks: EntityLink[] | undefined,
	exclude?: { entityKind: EntityKind; entityId?: string },
): EntityLink[] {
	const normalizedText = normalizeText(text);
	if (normalizedText.length < 3) return [];

	const existing = new Set(
		(currentLinks ?? []).map((link) => linkKey(link.entityKind, link.entityId)),
	);
	return listLinkableEntities(state, exclude)
		.filter((entity) => {
			const name = normalizeText(entity.name);
			return (
				name.length >= 3 &&
				normalizedText.includes(name) &&
				!existing.has(linkKey(entity.entityKind, entity.entityId))
			);
		})
		.slice(0, 8)
		.map((entity) => ({
			id: crypto.randomUUID(),
			entityKind: entity.entityKind,
			entityId: entity.entityId,
			label: "Menção detectada",
		}));
}

export function addEntityLink(
	currentLinks: EntityLink[] | undefined,
	nextLink: Omit<EntityLink, "id">,
): EntityLink[] {
	const links = currentLinks ?? [];
	const exists = links.some(
		(link) =>
			link.entityKind === nextLink.entityKind &&
			link.entityId === nextLink.entityId,
	);
	if (exists) return links;
	return [...links, { ...nextLink, id: crypto.randomUUID() }];
}

export function removeEntityLink(
	currentLinks: EntityLink[] | undefined,
	linkId: string,
): EntityLink[] {
	return (currentLinks ?? []).filter((link) => link.id !== linkId);
}

export function collectEntityText(values: Record<string, unknown>) {
	return Object.entries(values)
		.filter(([key]) => key !== "imageUrl" && key !== "mapUrl")
		.map(([, value]) => (typeof value === "string" ? value : ""))
		.join(" ");
}

function toLinkableEntity(
	entityKind: EntityKind,
	entity: Character | Npc | Session | Item | GameLocation | Lore,
	name: string,
	path: string,
): LinkableEntity {
	return {
		entityKind,
		entityId: entity.id,
		name: name || "Sem nome",
		label: ENTITY_KIND_LABELS[entityKind],
		path: entityKindPath(entityKind, entity.id, path),
	};
}

function entityKindPath(
	entityKind: EntityKind,
	entityId: string,
	path: string,
) {
	if (entityKind === "character") return `/sheets/${entityId}`;
	if (entityKind === "npc") return `/npcs/${entityId}`;
	if (entityKind === "session") return `/sessions/${entityId}`;
	if (entityKind === "item") return `/items/${entityId}`;
	if (entityKind === "location") return `/locations/${entityId}`;
	if (entityKind === "lore") return `/lore/${entityId}`;
	return `${path}?selected=${entityId}`;
}

function fallbackPathFor(kind: EntityKind) {
	const paths: Record<EntityKind, string> = {
		character: "/sheets",
		npc: "/npcs",
		session: "/sessions",
		item: "/items",
		location: "/locations",
		lore: "/lore",
	};
	return paths[kind];
}

function linkKey(entityKind: EntityKind, entityId: string) {
	return `${entityKind}:${entityId}`;
}

function normalizeText(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();
}
