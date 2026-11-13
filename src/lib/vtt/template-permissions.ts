/**
 * Quem pode apagar um molde de magia na mesa.
 * O dono apaga o seu. Mestre e co-mestre apagam qualquer um.
 * O papel do remetente vem de memberships/presença do receptor, nunca de um
 * campo de papel no payload do broadcast.
 */

export interface TemplateActor {
	userId?: string | null;
	isGM: boolean;
	isCoGM: boolean;
}

export interface SpellTemplateRef {
	id: string;
	userId?: string | null;
}

export interface TemplateMembership {
	userId: string;
	role: string;
}

export interface TemplatePresence {
	userId: string;
	isGM?: boolean;
	isCoGM?: boolean;
}

/** O que o receptor já sabe. Não inclui papel enviado no evento de remoção. */
export interface TemplateSenderSource {
	campaignOwnerId?: string | null;
	memberships?: readonly TemplateMembership[];
	presence?: readonly TemplatePresence[];
}

export function canRemoveSpellTemplate(
	actor: TemplateActor,
	template: { userId?: string | null },
	options?: { unownedBelongsTo?: string | null },
): boolean {
	if (!actor.userId) return false;
	if (actor.isGM || actor.isCoGM) return true;
	if (template.userId) return template.userId === actor.userId;
	const unownedBelongsTo = options?.unownedBelongsTo;
	return Boolean(unownedBelongsTo) && unownedBelongsTo === actor.userId;
}

/**
 * Papel do remetente no lado de quem recebe.
 * Membership conhecido vence a presença (a presença é declarada pelo cliente).
 * `campaignOwnerId` reconhece o mestre mesmo sem linha de membership.
 * Sem as duas, usa a presença já sincronizada. Sem nada disso, é jogador.
 */
export function resolveSenderTemplateRole(
	senderUserId: string | null | undefined,
	source: TemplateSenderSource,
): TemplateActor {
	if (!senderUserId) return { userId: null, isGM: false, isCoGM: false };
	const member = source.memberships?.find(
		(entry) => entry.userId === senderUserId,
	);
	if (member) {
		const isGM =
			member.role === "owner" || senderUserId === source.campaignOwnerId;
		return {
			userId: senderUserId,
			isGM,
			isCoGM: !isGM && member.role === "editor",
		};
	}
	if (source.campaignOwnerId && senderUserId === source.campaignOwnerId) {
		return { userId: senderUserId, isGM: true, isCoGM: false };
	}
	const present = source.presence?.find(
		(entry) => entry.userId === senderUserId,
	);
	if (present) {
		const isGM = present.isGM === true;
		return {
			userId: senderUserId,
			isGM,
			isCoGM: !isGM && present.isCoGM === true,
		};
	}
	return { userId: senderUserId, isGM: false, isCoGM: false };
}

export function filterRemovableTemplateIds(
	actor: TemplateActor,
	templates: readonly SpellTemplateRef[],
	ids: readonly string[],
): string[] {
	const byId = new Map(templates.map((template) => [template.id, template]));
	const allowed: string[] = [];
	const seen = new Set<string>();
	for (const id of ids) {
		if (seen.has(id)) continue;
		seen.add(id);
		const template = byId.get(id);
		if (!template) continue;
		if (canRemoveSpellTemplate(actor, template)) allowed.push(id);
	}
	return allowed;
}

/**
 * Ids que o receptor aceita remover. `claimedRole` existe só para deixar
 * explícito que um papel no payload é ignorado.
 */
export function acceptTemplateRemoval(input: {
	templates: readonly SpellTemplateRef[];
	requestedIds: readonly string[];
	senderUserId?: string | null;
	source: TemplateSenderSource;
	claimedRole?: { isGM?: boolean; isCoGM?: boolean };
}): string[] {
	void input.claimedRole;
	return filterRemovableTemplateIds(
		resolveSenderTemplateRole(input.senderUserId, input.source),
		input.templates,
		input.requestedIds,
	);
}

/**
 * Limpar todas: o jogador continua limpando só os moldes locais (os que ele
 * colocou). Mestre e co-mestre limpam os locais e os remotos.
 */
export function templateIdsToClear(
	actor: Pick<TemplateActor, "isGM" | "isCoGM">,
	placed: readonly { id: string }[],
	remoteIds: readonly string[],
): string[] {
	if (!(actor.isGM || actor.isCoGM))
		return placed.map((template) => template.id);
	const seen = new Set<string>();
	const ids: string[] = [];
	for (const id of [...placed.map((template) => template.id), ...remoteIds]) {
		if (seen.has(id)) continue;
		seen.add(id);
		ids.push(id);
	}
	return ids;
}

/**
 * Delete apaga o molde selecionado. Backspace não: nos tokens ele não é atalho
 * de exclusão (só a régua e a parede usam Backspace para desfazer um ponto).
 * `editable` vem de `isEditableElement` no alvo ou no foco.
 */
export function shouldDeleteSelectedTemplate(input: {
	key: string;
	editable: boolean;
	selectedTemplateId: string | null;
	canDelete: boolean;
}): string | null {
	if (input.editable) return null;
	if (input.key !== "Delete") return null;
	if (!input.selectedTemplateId || !input.canDelete) return null;
	return input.selectedTemplateId;
}
