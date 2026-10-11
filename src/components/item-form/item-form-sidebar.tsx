import {
	Check,
	ImagePlus,
	type LucideIcon,
	Package,
	ScrollText,
	Shield,
	Sparkles,
	Sword,
} from "lucide-react";
import {
	ARMOR_CATEGORY_LABELS,
	ARMOR_DEX_LABELS,
	ITEM_RARITY_OPTIONS,
	type ItemCategoryKind,
	type ItemFormTabId,
	summarizeItemForSheet,
	type TabStatus,
} from "@/core/rules/item-mechanics";
import type { ItemArmorStats, ItemWeaponStats } from "@/lib/store";
import { cn } from "@/lib/utils";
import { normalizeRarityKey, rarityStyleFor } from "../item-rarity";

export interface ItemTabDef {
	id: ItemFormTabId;
	label: string;
	icon: LucideIcon;
}

export function buildItemTabs(kind: ItemCategoryKind): ItemTabDef[] {
	const tabs: ItemTabDef[] = [
		{ id: "identity", label: "Identidade", icon: Package },
	];
	if (kind === "weapon")
		tabs.push({ id: "mechanics", label: "Ataque", icon: Sword });
	if (kind === "armor")
		tabs.push({ id: "mechanics", label: "Defesa", icon: Shield });
	tabs.push(
		{ id: "bonus", label: "Bônus", icon: Sparkles },
		{ id: "description", label: "Descrição", icon: ScrollText },
	);
	return tabs;
}

export function rarityLabel(value: string | undefined): string {
	const key = normalizeRarityKey(value);
	return (
		ITEM_RARITY_OPTIONS.find((o) => normalizeRarityKey(o.value) === key)
			?.label ?? "Comum"
	);
}

interface ItemThumbProps {
	src?: string;
	name: string;
	className?: string;
}

export function ItemThumb({ src, name, className }: ItemThumbProps) {
	return src ? (
		<img
			src={src}
			alt={name}
			className={cn(
				"h-14 w-14 shrink-0 rounded-xl border border-border/70 object-cover",
				className,
			)}
		/>
	) : (
		<div
			className={cn(
				"flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground",
				className,
			)}
			aria-hidden="true"
		>
			<ImagePlus className="h-5 w-5" />
		</div>
	);
}

export function ItemBadges({
	category,
	rarity,
}: {
	category: string;
	rarity: string;
}) {
	const style = rarityStyleFor(rarity);
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{category ? (
				<span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/20">
					{category}
				</span>
			) : null}
			<span
				className={cn(
					"rounded border bg-background/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
					style.border,
					style.tone,
				)}
			>
				{rarityLabel(rarity)}
			</span>
		</div>
	);
}

function StatusMark({ status }: { status: TabStatus }) {
	switch (status.kind) {
		case "done":
			return (
				<Check className="h-3.5 w-3.5 text-emerald-300" aria-label="Pronto" />
			);
		case "summary":
			return (
				<span className="text-[11px] tabular-nums text-muted-foreground">
					{status.text}
				</span>
			);
		case "optional":
			return (
				<span className="text-[10.5px] text-muted-foreground/80">opcional</span>
			);
		case "required":
			return (
				<span
					className="h-2 w-3.5 rounded-full bg-primary"
					role="img"
					aria-label="Falta preencher"
				/>
			);
		default:
			return <span className="text-[11px] text-muted-foreground">—</span>;
	}
}

interface SheetPreviewProps {
	kind: ItemCategoryKind;
	weapon?: ItemWeaponStats;
	armor?: ItemArmorStats;
}

function SheetPreview({ kind, weapon, armor }: SheetPreviewProps) {
	if (kind === "other") return null;
	const rows: [string, string][] = [];
	let empty = "";
	if (kind === "weapon") {
		const summary = summarizeItemForSheet(weapon);
		if (summary) {
			rows.push(["Acerto", summary.attack], ["Dano", summary.damage]);
			if (summary.extra) rows.push(["Extra", summary.extra]);
		} else empty = "Preencha o Ataque para ver como a arma entra na ficha.";
	} else if (armor) {
		rows.push(
			["CA base", String(armor.baseAc)],
			["DES", ARMOR_DEX_LABELS[armor.dexMode]],
			["Categoria", ARMOR_CATEGORY_LABELS[armor.armorCategory]],
		);
	} else empty = "Preencha a Defesa para ver como o item entra na ficha.";

	return (
		<div className="rounded-xl border border-border/60 bg-background/40 p-3">
			<p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
				Na ficha
			</p>
			{rows.length ? (
				<dl className="divide-y divide-border/50">
					{rows.map(([label, value]) => (
						<div
							key={label}
							className="flex items-center justify-between py-1.5 text-[11.5px]"
						>
							<dt className="text-muted-foreground">{label}</dt>
							<dd className="font-semibold tabular-nums text-foreground">
								{value}
							</dd>
						</div>
					))}
				</dl>
			) : (
				<p className="text-[11.5px] leading-relaxed text-muted-foreground">
					{empty}
				</p>
			)}
		</div>
	);
}

interface ItemFormSidebarProps {
	name: string;
	placeholderName: string;
	line: string;
	category: string;
	rarity: string;
	imageSrc?: string;
	tabs: ItemTabDef[];
	activeTab: ItemFormTabId;
	onTabChange: (tab: ItemFormTabId) => void;
	statuses: Record<ItemFormTabId, TabStatus>;
	kind: ItemCategoryKind;
	weapon?: ItemWeaponStats;
	armor?: ItemArmorStats;
}

/** Coluna lateral (desktop): miniatura, nome ao vivo, abas com status e prévia "Na ficha". */
export function ItemFormSidebar({
	name,
	placeholderName,
	line,
	category,
	rarity,
	imageSrc,
	tabs,
	activeTab,
	onTabChange,
	statuses,
	kind,
	weapon,
	armor,
}: ItemFormSidebarProps) {
	const displayName = name.trim() || placeholderName;
	return (
		<aside className="hidden w-[240px] shrink-0 flex-col border-r border-border/60 bg-background/30 p-4 sm:flex">
			<div className="flex items-start gap-3">
				<ItemThumb src={imageSrc} name={displayName} />
				<div className="min-w-0 space-y-1">
					<p
						className={cn(
							"line-clamp-2 font-display text-[15px] leading-tight",
							name.trim() ? "text-foreground" : "text-muted-foreground",
						)}
						data-testid="item-live-name"
					>
						{displayName}
					</p>
					{name.trim() ? (
						<p className="truncate text-[11.5px] text-muted-foreground">
							{line}
						</p>
					) : null}
					<ItemBadges category={category} rarity={rarity} />
				</div>
			</div>

			<nav aria-label="Seções do item" className="mt-5 flex flex-col gap-1">
				{tabs.map((tab) => {
					const active = tab.id === activeTab;
					const Icon = tab.icon;
					return (
						<button
							key={tab.id}
							type="button"
							aria-current={active ? "page" : undefined}
							onClick={() => onTabChange(tab.id)}
							className={cn(
								"flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-lg border px-3 text-left text-[13px] transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
								active
									? "border-border/70 bg-card font-semibold text-foreground shadow-xs"
									: "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
							)}
						>
							<Icon
								className={cn("h-4 w-4", active ? "text-primary" : undefined)}
							/>
							<span className="flex-1">{tab.label}</span>
							<StatusMark status={statuses[tab.id]} />
						</button>
					);
				})}
			</nav>

			<div className="mt-auto pt-4">
				<SheetPreview kind={kind} weapon={weapon} armor={armor} />
			</div>
		</aside>
	);
}
