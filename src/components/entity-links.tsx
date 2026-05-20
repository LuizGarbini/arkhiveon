import {
	addEntityLink,
	collectEntityText,
	listLinkableEntities,
	removeEntityLink,
	resolveEntityLinks,
	suggestEntityLinksFromText,
} from "@/lib/entity-links";
import type { EntityKind, EntityLink } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { Link2, Plus, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Field, FormSection } from "./ui/form-tabs";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

interface EntityLinkManagerProps {
	value?: EntityLinkInput;
	onChange: (links: EntityLink[]) => void;
	sourceValues?: Record<string, unknown>;
	currentEntity?: { entityKind: EntityKind; entityId?: string };
}

type EntityLinkInput = Array<Partial<EntityLink>> | undefined;

export function EntityLinkManager({
	value,
	onChange,
	sourceValues,
	currentEntity,
}: EntityLinkManagerProps) {
	const collections = useEntityCollections();
	const [selectedKey, setSelectedKey] = useState("");
	const [note, setNote] = useState("");
	const currentLinks = normalizeLinks(value);
	const options = useMemo(
		() => listLinkableEntities(collections, currentEntity),
		[collections, currentEntity],
	);
	const suggestions = useMemo(
		() =>
			suggestEntityLinksFromText(
				sourceValues ? collectEntityText(sourceValues) : "",
				collections,
				currentLinks,
				currentEntity,
			),
		[collections, currentLinks, currentEntity, sourceValues],
	);
	const resolvedSuggestions = resolveEntityLinks(suggestions, collections);

	function addSelectedLink() {
		if (!selectedKey) return;
		const [entityKind, entityId] = selectedKey.split(":") as [
			EntityKind,
			string,
		];
		onChange(
			addEntityLink(currentLinks, {
				entityKind,
				entityId,
				note: note.trim() || undefined,
			}),
		);
		setSelectedKey("");
		setNote("");
	}

	function addSuggestedLink(link: EntityLink) {
		onChange(
			addEntityLink(currentLinks, {
				entityKind: link.entityKind,
				entityId: link.entityId,
				label: link.label,
			}),
		);
	}

	return (
		<FormSection
			title="Conexões"
			description="Conecte este registro a fichas, NPCs, sessões, itens, locais e lore."
		>
			<div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
				<Field label="Entidade">
					<Select
						value={selectedKey}
						onChange={(event) => setSelectedKey(event.target.value)}
					>
						<option value="">Selecione uma conexão</option>
						{options.map((entity) => (
							<option
								key={`${entity.entityKind}:${entity.entityId}`}
								value={`${entity.entityKind}:${entity.entityId}`}
							>
								{entity.label}: {entity.name}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Nota opcional">
					<Input
						value={note}
						onChange={(event) => setNote(event.target.value)}
						placeholder="Ex: aliado, citado, dono..."
					/>
				</Field>
				<div className="flex items-end">
					<Button
						type="button"
						variant="outline"
						className="w-full gap-2"
						onClick={addSelectedLink}
						disabled={!selectedKey}
					>
						<Plus className="h-4 w-4" />
						Adicionar
					</Button>
				</div>
			</div>

			<EntityLinkChips
				links={currentLinks}
				onRemove={(linkId) => onChange(removeEntityLink(currentLinks, linkId))}
			/>

			{resolvedSuggestions.length > 0 && (
				<div className="rounded-2xl border border-primary/20 bg-primary/8 p-3">
					<div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
						<Sparkles className="h-3.5 w-3.5" />
						Sugestões por menção
					</div>
					<div className="mt-3 flex flex-wrap gap-2">
						{resolvedSuggestions.map((link) => (
							<button
								key={`${link.entityKind}:${link.entityId}`}
								type="button"
								onClick={() => addSuggestedLink(link)}
								className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/50 px-3 py-1.5 text-[11px] font-bold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
							>
								<Plus className="h-3 w-3" />
								{link.kindLabel}: {link.name}
							</button>
						))}
					</div>
				</div>
			)}
		</FormSection>
	);
}

export function EntityLinkChips({
	links,
	onRemove,
	emptyText,
}: {
	links?: EntityLinkInput;
	onRemove?: (linkId: string) => void;
	emptyText?: string;
}) {
	const collections = useEntityCollections();
	const resolvedLinks = resolveEntityLinks(normalizeLinks(links), collections);

	if (resolvedLinks.length === 0) {
		if (!emptyText) return null;
		return (
			<p className="text-[11px] leading-relaxed text-muted-foreground">
				{emptyText}
			</p>
		);
	}

	return (
		<div className="flex flex-wrap gap-1.5">
			{resolvedLinks.map((link) => (
				<span
					key={link.id}
					className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
						link.missing
							? "border-border/70 bg-muted/30 text-muted-foreground"
							: "border-primary/20 bg-primary/10 text-primary"
					}`}
				>
					<Link2 className="h-3 w-3 shrink-0" />
					<a href={link.path} className="truncate hover:underline">
						{link.kindLabel}: {link.name}
					</a>
					{link.note && (
						<span className="max-w-[120px] truncate text-muted-foreground">
							· {link.note}
						</span>
					)}
					{onRemove && (
						<button
							type="button"
							onClick={() => onRemove(link.id)}
							className="ml-0.5 rounded-full text-muted-foreground transition-colors hover:text-rose-300"
							title="Remover conexão"
						>
							<X className="h-3 w-3" />
						</button>
					)}
				</span>
			))}
		</div>
	);
}

function useEntityCollections() {
	const characters = useRPGStore((state) => state.characters);
	const npcs = useRPGStore((state) => state.npcs);
	const sessions = useRPGStore((state) => state.sessions);
	const items = useRPGStore((state) => state.items);
	const locations = useRPGStore((state) => state.locations);
	const lores = useRPGStore((state) => state.lores);

	return useMemo(
		() => ({ characters, npcs, sessions, items, locations, lores }),
		[characters, npcs, sessions, items, locations, lores],
	);
}

function normalizeLinks(links: EntityLinkInput): EntityLink[] {
	return (links ?? []).filter((link): link is EntityLink => {
		return (
			typeof link.id === "string" &&
			typeof link.entityKind === "string" &&
			typeof link.entityId === "string"
		);
	});
}
