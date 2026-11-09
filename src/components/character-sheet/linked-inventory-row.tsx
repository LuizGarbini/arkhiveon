import {
	AlertTriangle,
	Backpack,
	Coins,
	Gem,
	Link2,
	Package,
	ShieldCheck,
	Sparkles,
	Sword,
	Unlink,
	Warehouse,
	Weight,
} from "lucide-react";
import { type ComponentType, useState } from "react";
import {
	DetailInfo,
	DetailQuickStat,
	DetailSection,
	DetailText,
} from "@/components/entity-detail";
import { FramedImage } from "@/components/framed-image";
import { EntityImageViewer } from "@/components/images/entity-image-viewer";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	describeLinkCandidate,
	type InventoryLocation,
	previewLinkEffect,
} from "@/core/rules";
import { resolveItemImageUrl } from "@/lib/character-images";
import { useActiveCampaignRole, useImageAssetLookup } from "@/lib/store";
import type { Character, InventoryItem, Item } from "@/lib/store/types";
import { cn } from "@/lib/utils";

const LOCATION_OPTIONS: {
	id: InventoryLocation;
	label: string;
	Icon: ComponentType<{ className?: string }>;
}[] = [
	{ id: "equipped", label: "No Corpo", Icon: Sword },
	{ id: "backpack", label: "Mochila", Icon: Backpack },
	{ id: "mount_stash", label: "Montaria", Icon: Warehouse },
];

/** Troca de local sem `<select>` nativo (radiogroup com os tokens do DS). */
export function LocationToggle({
	value,
	onChange,
	disabled,
	label,
}: {
	value: InventoryLocation;
	onChange: (next: InventoryLocation) => void;
	disabled?: boolean;
	label: string;
}) {
	return (
		<div
			role="radiogroup"
			aria-label={label}
			className="flex rounded-lg border border-border/50 bg-background p-0.5"
		>
			{LOCATION_OPTIONS.map(({ id, label: optionLabel, Icon }) => {
				const active = id === value;
				return (
					// biome-ignore lint/a11y/useSemanticElements: troca de local compacta
					<button
						key={id}
						type="button"
						role="radio"
						aria-checked={active}
						aria-label={optionLabel}
						title={optionLabel}
						disabled={disabled}
						onClick={() => onChange(id)}
						className={cn(
							"flex min-h-11 min-w-11 cursor-pointer select-none items-center justify-center rounded-md px-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-7 sm:min-w-7",
							active
								? "bg-primary/15 text-primary"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon className="h-3.5 w-3.5" />
					</button>
				);
			})}
		</div>
	);
}

function PressChip({
	pressed,
	onToggle,
	disabled,
	children,
}: {
	pressed: boolean;
	onToggle: () => void;
	disabled?: boolean;
	children: string;
}) {
	return (
		<button
			type="button"
			aria-pressed={pressed}
			disabled={disabled}
			onClick={onToggle}
			className={cn(
				"inline-flex min-h-11 cursor-pointer select-none items-center rounded-full border px-2.5 text-[11px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-7",
				pressed
					? "border-primary/40 bg-primary/10 text-primary"
					: "border-border/60 text-muted-foreground hover:text-foreground",
			)}
		>
			{children}
		</button>
	);
}

function ItemPortrait({
	src,
	name,
	framing,
	large = false,
}: {
	src: string;
	name: string;
	framing?: Item;
	large?: boolean;
}) {
	return (
		<div
			className={cn(
				"relative shrink-0 overflow-hidden rounded-2xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20",
				large ? "size-28 sm:size-36" : "size-14",
			)}
		>
			{src ? (
				<FramedImage src={src} alt={name} framing={framing} />
			) : (
				<div className="flex h-full w-full items-center justify-center">
					<Gem className={large ? "size-10" : "size-6"} strokeWidth={1.5} />
				</div>
			)}
			{large && src && <EntityImageViewer src={src} name={name} />}
		</div>
	);
}

function ItemSummary({
	name,
	quantity,
	linked,
	summary,
	effect,
	preview,
	imageUrl,
	framing,
}: {
	name: string;
	quantity: number;
	linked: boolean;
	summary: string;
	effect: string;
	preview: string;
	imageUrl: string;
	framing?: Item;
}) {
	return (
		<div className="flex gap-3">
			<ItemPortrait src={imageUrl} name={name} framing={framing} />
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<Link2
						className={cn(
							"h-3.5 w-3.5 shrink-0",
							linked ? "text-primary" : "text-amber-400",
						)}
						aria-label="Vinculado à aba Itens"
					/>
					<span
						className={cn(
							"text-sm font-semibold text-foreground",
							!linked && "text-muted-foreground line-through",
						)}
					>
						{name}
					</span>
					<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						x{quantity}
					</span>
					{!linked && (
						<span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
							<AlertTriangle className="h-3 w-3" />
							Item indisponível
						</span>
					)}
				</div>
				<p
					className={cn(
						"text-sm leading-relaxed",
						linked ? "text-foreground" : "text-muted-foreground",
					)}
				>
					{summary}
				</p>
				{effect && (
					<p className="text-sm font-semibold leading-relaxed text-primary">
						{effect}
					</p>
				)}
				{preview && (
					<p className="line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
						{preview}
					</p>
				)}
			</div>
		</div>
	);
}

function ItemDetailsDialog({
	item,
	effect,
	imageUrl,
	open,
	onOpenChange,
}: {
	item: Item;
	effect: string;
	imageUrl: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const subtitle = [item.rarity || "comum", item.type, item.subtype]
		.filter(Boolean)
		.join(" · ");
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-3xl">
				<div className="min-h-0 flex-1 overflow-y-auto p-6">
					<DialogHeader className="pr-8">
						<div className="flex items-start gap-4">
							<ItemPortrait
								src={imageUrl}
								name={item.name}
								framing={item}
								large
							/>
							<div className="min-w-0">
								<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
									<Package className="h-3.5 w-3.5" />
									Item
								</div>
								<DialogTitle className="font-display mt-3 text-3xl font-bold tracking-tight">
									{item.name || "Item sem nome"}
								</DialogTitle>
								<DialogDescription className="mt-2 text-[13px]">
									{subtitle || "Tesouro da campanha"}
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>
					<div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
						<DetailQuickStat
							Icon={Sparkles}
							label="Raridade"
							value={item.rarity || "comum"}
							color="text-emerald-300"
						/>
						<DetailQuickStat
							Icon={Weight}
							label="Peso"
							value={item.weight || "-"}
							color="text-muted-foreground"
						/>
						<DetailQuickStat
							Icon={Coins}
							label="Valor"
							value={item.value || "-"}
							color="text-amber-300"
						/>
						<DetailQuickStat
							Icon={Gem}
							label="Cargas"
							value={item.charges || "-"}
							color="text-fuchsia-300"
						/>
					</div>
					<div className="mt-5 grid gap-5">
						<DetailSection
							eyebrow="Mecânica"
							title="Efeitos"
							className="bg-card"
						>
							<div className="grid gap-3">
								{effect && <DetailText title="Na ficha" value={effect} />}
								<DetailText
									title="Atributos / efeitos"
									value={item.stats}
									mono
								/>
								<DetailInfo label="Propriedades" value={item.properties} />
							</div>
						</DetailSection>
						<DetailSection eyebrow="Descrição" title="Lore" className="bg-card">
							<DetailText value={item.description} />
						</DetailSection>
						<DetailSection
							eyebrow="Resumo"
							title="Identificação"
							className="bg-card"
						>
							<div className="grid gap-3 sm:grid-cols-2">
								<DetailInfo label="Tipo" value={item.type} />
								<DetailInfo label="Subtipo" value={item.subtype} />
								<DetailInfo label="Fonte" value={item.source} />
								<DetailInfo
									Icon={ShieldCheck}
									label="Requer sintonia"
									value={item.requiresAttunement}
								/>
							</div>
						</DetailSection>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

/**
	name,
	quantity,
	linked,
	summary,
	effect,
	preview,
}: {
	name: string;
	quantity: number;
	linked: boolean;
	summary: string;
	effect: string;
	preview: string;
}) {
	return (
		<>
			<div className="flex flex-wrap items-center gap-2">
				<Link2
					className={cn(
						"h-3.5 w-3.5 shrink-0",
						linked ? "text-primary" : "text-amber-400",
					)}
					aria-label="Vinculado à aba Itens"
				/>
				<span
					className={cn(
						"text-sm font-semibold text-foreground",
						!linked && "text-muted-foreground line-through",
					)}
				>
					{name}
				</span>
				<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
					x{quantity}
				</span>
				{!linked && (
					<span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
						<AlertTriangle className="h-3 w-3" />
						Item indisponível
					</span>
				)}
			</div>
			<p
				className={cn(
					"text-sm leading-relaxed",
					linked ? "text-foreground" : "text-muted-foreground",
				)}
			>
				{summary}
			</p>
			{effect && (
				<p className="text-sm font-semibold leading-relaxed text-primary">
					{effect}
				</p>
			)}
			{preview && (
				<p className="line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
					{preview}
				</p>
			)}
		</>
	);
}

/**
 * Entrada do inventário vinculada a um Item da campanha. Números são do Item
 * (só leitura aqui); dá para mudar local, quantidade, sintonizado e proficiente.
 */
export function LinkedInventoryRow({
	entry,
	item,
	character,
	canEditLink,
	onChange,
	onQuantity,
	onUnlink,
	quantityDisabled,
	quantityTitle,
}: {
	entry: InventoryItem;
	/** null = item apagado ou secreto. */
	item: Item | null;
	character: Pick<
		Character,
		| "strength"
		| "dexterity"
		| "constitution"
		| "intelligence"
		| "wisdom"
		| "charisma"
		| "level"
		| "proficiencyBonus"
		| "armorClass"
		| "initiative"
	>;
	canEditLink: boolean;
	onChange: (patch: Partial<InventoryItem>) => void;
	onQuantity: (delta: number) => void;
	onUnlink: () => void;
	quantityDisabled?: boolean;
	quantityTitle?: string;
}) {
	const name = item?.name ?? entry.name;
	const isWeapon = entry.category === "weapon";
	const weight = (entry.weightLbs || 0) * (entry.quantity || 1);
	const effect = item
		? previewLinkEffect(item, character, {
				location: entry.location,
				proficient: entry.proficient !== false,
			})
		: null;
	const showSheetEffect =
		effect !== null && (effect.kind === "attack" || effect.kind === "defense");
	const stats = item?.stats?.trim() ?? "";
	const description = item?.description?.trim() ?? "";
	const [detailsOpen, setDetailsOpen] = useState(false);
	const imageAssets = useImageAssetLookup();
	const role = useActiveCampaignRole();
	const imageUrl = item ? resolveItemImageUrl(item, imageAssets, role) : "";
	return (
		<div
			className={cn(
				"flex flex-col gap-3 rounded-xl border p-3 transition-colors",
				item
					? "border-primary/25 bg-primary/5 hover:border-primary/40"
					: "border-amber-500/30 bg-amber-500/5",
			)}
		>
			{item ? (
				<button
					type="button"
					aria-label={`Ver detalhes de ${name}`}
					className="w-full cursor-pointer space-y-1.5 rounded-lg text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={() => setDetailsOpen(true)}
				>
					<ItemSummary
						name={name}
						quantity={entry.quantity}
						linked
						summary={describeLinkCandidate(item)}
						effect={showSheetEffect ? effect.text : ""}
						preview={description || stats}
						imageUrl={imageUrl}
						framing={item}
					/>
				</button>
			) : (
				<div className="space-y-1.5">
					<ItemSummary
						name={name}
						quantity={entry.quantity}
						linked={false}
						summary="O item foi apagado ou ficou secreto. Não soma nada na ficha."
						effect=""
						preview=""
						imageUrl=""
					/>
				</div>
			)}
			{item && (
				<ItemDetailsDialog
					item={item}
					effect={showSheetEffect ? effect.text : ""}
					imageUrl={imageUrl}
					open={detailsOpen}
					onOpenChange={setDetailsOpen}
				/>
			)}

			<div className="flex flex-wrap items-center gap-2">
				<span className="font-mono text-xs text-muted-foreground">
					{weight.toFixed(1)} lbs
				</span>
				<div
					className="flex items-center gap-1 rounded-lg border border-border/50 bg-background p-0.5"
					title={quantityTitle}
				>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						className="h-11 w-11 p-0 sm:h-6 sm:w-6"
						aria-label={`Diminuir ${name}`}
						disabled={quantityDisabled}
						title={quantityTitle}
						onClick={() => onQuantity(-1)}
					>
						-
					</Button>
					<span className="px-1.5 font-mono text-xs font-bold tabular-nums">
						{entry.quantity}
					</span>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						className="h-11 w-11 p-0 sm:h-6 sm:w-6"
						aria-label={`Aumentar ${name}`}
						disabled={quantityDisabled}
						title={quantityTitle}
						onClick={() => onQuantity(1)}
					>
						+
					</Button>
				</div>
				{item && (
					<LocationToggle
						label={`Onde fica ${name}`}
						value={entry.location}
						disabled={!canEditLink}
						onChange={(location) => onChange({ location })}
					/>
				)}
				{item && isWeapon && (
					<PressChip
						pressed={entry.proficient !== false}
						disabled={!canEditLink}
						onToggle={() =>
							onChange({ proficient: entry.proficient === false })
						}
					>
						Proficiente
					</PressChip>
				)}
				{item?.requiresAttunement && (
					<PressChip
						pressed={entry.isAttuned === true}
						disabled={!canEditLink}
						onToggle={() => onChange({ isAttuned: entry.isAttuned !== true })}
					>
						Sintonizado
					</PressChip>
				)}
				{canEditLink && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={onUnlink}
						className="min-h-11 gap-1.5 text-xs text-muted-foreground hover:text-rose-300 sm:min-h-0"
					>
						<Unlink className="h-3.5 w-3.5" />
						Desvincular
					</Button>
				)}
			</div>
		</div>
	);
}
