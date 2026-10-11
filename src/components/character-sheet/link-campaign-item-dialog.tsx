import {
	Backpack,
	Check,
	Crosshair,
	FlaskConical,
	Gem,
	Link2,
	Package,
	Search,
	Shield,
	Sword,
	Warehouse,
	X,
} from "lucide-react";
import { type ComponentType, useDeferredValue, useMemo, useState } from "react";
import { normalizeRarityKey, rarityStyleFor } from "@/components/item-rarity";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	describeLinkCandidate,
	type InventoryLocation,
	LINK_FILTERS,
	type LinkedEntry,
	type LinkFilter,
	linkKindOf,
	makeLinkedEntry,
	matchesLinkFilter,
	previewLinkEffect,
} from "@/core/rules";
import { ITEM_RARITY_OPTIONS } from "@/core/rules/item-mechanics";
import type { Character, InventoryItem, Item } from "@/lib/store/types";
import { cn } from "@/lib/utils";

const LOCATIONS: {
	id: InventoryLocation;
	label: string;
	hint: string;
	Icon: ComponentType<{ className?: string }>;
}[] = [
	{ id: "equipped", label: "No Corpo", hint: "Entra no cálculo", Icon: Sword },
	{ id: "backpack", label: "Mochila", hint: "Só carrega", Icon: Backpack },
	{ id: "mount_stash", label: "Montaria", hint: "Não pesa", Icon: Warehouse },
];

function iconFor(item: Item): ComponentType<{ className?: string }> {
	const kind = linkKindOf(item);
	if (kind === "weapon") {
		const p = item.weapon?.properties ?? [];
		return p.includes("ammunition") || p.includes("loading")
			? Crosshair
			: Sword;
	}
	if (kind === "armor") return Shield;
	if (kind === "ring") return Gem;
	if (kind === "consumable") return FlaskConical;
	return Package;
}

function rarityLabel(value: string): string {
	const key = normalizeRarityKey(value);
	return (
		ITEM_RARITY_OPTIONS.find((o) => normalizeRarityKey(o.value) === key)
			?.label ??
		value ??
		"Comum"
	);
}

function normalize(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

export interface LinkCampaignItemDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	character: Character;
	/** Itens da aba Itens que este usuário enxerga. */
	items: Item[];
	/** Vínculos que a ficha já tem (CA/iniciativa somam com eles na prévia). */
	current: LinkedEntry[];
	onLink: (entry: InventoryItem) => void;
}

/**
 * "Adicionar da campanha": Dialog no desktop; no mobile, sheet ancorado
 * embaixo, sem X, com o efeito dentro do botão.
 */
export function LinkCampaignItemDialog({
	open,
	onOpenChange,
	character,
	items,
	current,
	onLink,
}: LinkCampaignItemDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className={cn(
					"flex flex-col gap-0 overflow-hidden p-0",
					"top-auto bottom-0 left-0 max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl rounded-b-none border-x-0 border-b-0",
					"sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[min(88vh,760px)] sm:w-[calc(100%-2rem)] sm:max-w-[600px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border",
				)}
			>
				{open && (
					<LinkCampaignItemBody
						character={character}
						items={items}
						current={current}
						onCancel={() => onOpenChange(false)}
						onLink={(entry) => {
							onLink(entry);
							onOpenChange(false);
						}}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function LinkCampaignItemBody({
	character,
	items,
	current,
	onCancel,
	onLink,
}: Omit<LinkCampaignItemDialogProps, "open" | "onOpenChange" | "onLink"> & {
	onCancel: () => void;
	onLink: (entry: InventoryItem) => void;
}) {
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const [filter, setFilter] = useState<LinkFilter>("all");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [location, setLocation] = useState<InventoryLocation>("equipped");
	const [proficient, setProficient] = useState(true);

	const visible = useMemo(() => {
		const q = normalize(deferredQuery.trim());
		return items
			.filter((i) => matchesLinkFilter(i, filter))
			.filter((i) => !q || normalize(i.name).includes(q))
			.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
	}, [items, filter, deferredQuery]);

	const selected = items.find((i) => i.id === selectedId) ?? null;
	const isWeapon = selected ? linkKindOf(selected) === "weapon" : false;
	const effect = useMemo(
		() =>
			selected
				? previewLinkEffect(
						selected,
						character,
						{ location, proficient },
						current,
					)
				: null,
		[selected, character, location, proficient, current],
	);
	const firstName =
		character.characterName?.trim().split(/\s+/)[0] || "O personagem";

	const confirm = () => {
		if (!selected) return;
		onLink(makeLinkedEntry(selected, { location, proficient }));
	};

	return (
		<form
			className="flex min-h-0 flex-1 flex-col"
			onSubmit={(e) => {
				e.preventDefault();
				confirm();
			}}
		>
			<div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
				<span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
			</div>
			<div className="flex items-start justify-between gap-3 px-4 pt-3 sm:px-6 sm:pt-6">
				<div className="min-w-0">
					<DialogTitle className="font-semibold text-lg text-foreground sm:text-base">
						Adicionar da campanha
					</DialogTitle>
					<DialogDescription className="hidden text-xs sm:block">
						Escolha um item cadastrado na aba Itens e onde ele fica.
					</DialogDescription>
				</div>
				<button
					type="button"
					onClick={onCancel}
					aria-label="Fechar"
					className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			<div className="space-y-3 px-4 pt-3 sm:px-6 sm:pt-4">
				<div className="relative">
					<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="search"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Buscar na aba Itens da campanha..."
						aria-label="Buscar item da campanha"
						className="h-11 pl-9 sm:h-10"
					/>
				</div>
				<div
					role="radiogroup"
					aria-label="Categoria"
					className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
				>
					{LINK_FILTERS.map((f) => {
						const active = f.id === filter;
						return (
							// biome-ignore lint/a11y/useSemanticElements: chips de categoria
							<button
								key={f.id}
								type="button"
								role="radio"
								aria-checked={active}
								onClick={() => setFilter(f.id)}
								className={cn(
									"inline-flex min-h-11 shrink-0 cursor-pointer select-none items-center rounded-full border px-4 text-[13px] font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8 sm:px-3.5 sm:text-xs",
									active
										? "border-primary/40 bg-primary/15 text-primary"
										: "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground",
								)}
							>
								{f.label}
							</button>
						);
					})}
				</div>
			</div>

			<div
				role="radiogroup"
				aria-label="Itens da campanha"
				className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3 sm:px-6"
			>
				{items.length === 0 ? (
					<p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
						Nenhum item na aba Itens ainda. Cadastre o item lá e volte aqui para
						vincular.
					</p>
				) : visible.length === 0 ? (
					<p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
						Nada encontrado. Tente outro nome ou a aba Todos.
					</p>
				) : (
					visible.map((item) => {
						const Icon = iconFor(item);
						const style = rarityStyleFor(item.rarity);
						const active = item.id === selectedId;
						return (
							// biome-ignore lint/a11y/useSemanticElements: lista de escolha única
							<button
								key={item.id}
								type="button"
								role="radio"
								aria-checked={active}
								onClick={() => setSelectedId(item.id)}
								className={cn(
									"flex min-h-14 w-full cursor-pointer select-none items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
									active
										? "border-primary/50 bg-primary/10"
										: "border-border/60 bg-background/40 hover:border-border",
								)}
							>
								<span
									className={cn(
										"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-b to-background/40",
										style.border,
										style.glow,
										style.tone,
									)}
								>
									<Icon className="h-4 w-4" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-semibold text-foreground">
										{item.name}
									</span>
									<span className="block truncate text-xs text-muted-foreground">
										{describeLinkCandidate(item)}
									</span>
								</span>
								{active ? (
									<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
										<Check className="h-3 w-3" />
									</span>
								) : (
									<span
										className={cn(
											"shrink-0 text-[10px] font-bold uppercase tracking-[0.15em]",
											style.tone,
										)}
									>
										{rarityLabel(item.rarity)}
									</span>
								)}
							</button>
						);
					})
				)}
			</div>

			<div className="space-y-3 border-t border-border/50 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:border-t-0 sm:px-6 sm:pt-1 sm:pb-6">
				<p className="heading-rule text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
					Onde fica
				</p>
				<div
					role="radiogroup"
					aria-label="Onde fica"
					className="grid grid-cols-3 gap-2"
				>
					{LOCATIONS.map(({ id, label, hint, Icon }) => {
						const active = id === location;
						return (
							// biome-ignore lint/a11y/useSemanticElements: escolha de local
							<button
								key={id}
								type="button"
								role="radio"
								aria-checked={active}
								onClick={() => setLocation(id)}
								className={cn(
									"flex min-h-14 cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:justify-start sm:gap-2.5 sm:px-3 sm:text-left",
									active
										? "border-primary/50 bg-primary/10 text-foreground"
										: "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon
									className={cn("h-4 w-4 shrink-0", active && "text-primary")}
								/>
								<span className="min-w-0">
									<span className="block text-[13px] font-semibold">
										{label}
									</span>
									<span className="hidden text-[11px] text-muted-foreground sm:block">
										{hint}
									</span>
								</span>
							</button>
						);
					})}
				</div>

				{isWeapon && (
					<label className="flex min-h-11 cursor-pointer select-none items-center gap-2.5 text-[13px] text-foreground sm:min-h-0">
						<input
							type="checkbox"
							checked={proficient}
							onChange={(e) => setProficient(e.target.checked)}
							className="h-4 w-4 accent-primary"
						/>
						<span className="hidden sm:inline">
							{firstName} é proficiente com esta arma
						</span>
						<span className="sm:hidden">Proficiente com esta arma</span>
					</label>
				)}

				<p
					className="hidden items-center gap-2 rounded-lg bg-background/50 px-3 py-2 text-xs text-muted-foreground sm:flex"
					aria-live="polite"
					data-testid="link-effect"
				>
					<Sword className="h-3.5 w-3.5 shrink-0 text-primary" />
					{!effect ? (
						"Escolha um item para ver o que muda na ficha."
					) : effect.parts.length === 0 ? (
						<span>{effect.text}</span>
					) : (
						<span>
							{effect.prefix}{" "}
							{effect.parts.map((p, i) => (
								<span key={p.label}>
									{i > 0 && " · "}
									<strong className="font-semibold text-foreground">
										{p.label} {p.value}
									</strong>
									{p.suffix ? ` ${p.suffix}` : ""}
								</span>
							))}
						</span>
					)}
				</p>

				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						className="hidden sm:inline-flex"
					>
						Cancelar
					</Button>
					<Button
						type="submit"
						disabled={!selected}
						className="min-h-12 w-full gap-2 sm:min-h-0 sm:w-auto"
					>
						<Link2 className="h-4 w-4" />
						<span className="hidden sm:inline">Vincular à ficha</span>
						<span className="truncate sm:hidden">
							{effect ? `Vincular · ${effect.short}` : "Vincular"}
						</span>
					</Button>
				</div>
			</div>
		</form>
	);
}
