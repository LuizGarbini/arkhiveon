import {
	AlertTriangle,
	Backpack,
	Link2,
	Sword,
	Unlink,
	Warehouse,
} from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { describeLinkCandidate, type InventoryLocation } from "@/core/rules";
import type { InventoryItem, Item } from "@/lib/store/types";
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

/**
 * Entrada do inventário vinculada a um Item da campanha. Números são do Item
 * (só leitura aqui); dá para mudar local, quantidade, sintonizado e proficiente.
 */
export function LinkedInventoryRow({
	entry,
	item,
	canEditLink,
	onChange,
	onQuantity,
	onUnlink,
}: {
	entry: InventoryItem;
	/** null = item apagado ou secreto. */
	item: Item | null;
	canEditLink: boolean;
	onChange: (patch: Partial<InventoryItem>) => void;
	onQuantity: (delta: number) => void;
	onUnlink: () => void;
}) {
	const name = item?.name ?? entry.name;
	const isWeapon = entry.category === "weapon";
	const weight = (entry.weightLbs || 0) * (entry.quantity || 1);
	return (
		<div
			className={cn(
				"flex flex-col justify-between gap-3 rounded-xl border p-3 transition-colors sm:flex-row sm:items-center",
				item
					? "border-primary/25 bg-primary/5 hover:border-primary/40"
					: "border-amber-500/30 bg-amber-500/5",
			)}
		>
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<Link2
						className={cn(
							"h-3.5 w-3.5 shrink-0",
							item ? "text-primary" : "text-amber-400",
						)}
						aria-label="Vinculado à aba Itens"
					/>
					<span
						className={cn(
							"text-xs font-bold text-foreground",
							!item && "text-muted-foreground line-through",
						)}
					>
						{name}
					</span>
					<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						x{entry.quantity}
					</span>
					{!item && (
						<span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
							<AlertTriangle className="h-3 w-3" />
							Item indisponível
						</span>
					)}
				</div>
				<p className="text-[11px] leading-relaxed text-muted-foreground">
					{item
						? `${describeLinkCandidate(item)} · da aba Itens`
						: "O item foi apagado ou ficou secreto. Não soma nada na ficha."}
				</p>
			</div>

			<div className="flex shrink-0 flex-wrap items-center gap-2 self-end sm:self-center">
				<span className="font-mono text-xs text-muted-foreground">
					{weight.toFixed(1)} lbs
				</span>
				<div className="flex items-center gap-1 rounded-lg border border-border/50 bg-background p-0.5">
					<Button
						type="button"
						variant="ghost"
						size="xs"
						className="h-11 w-11 p-0 sm:h-6 sm:w-6"
						aria-label={`Diminuir ${name}`}
						onClick={() => onQuantity(-1)}
					>
						-
					</Button>
					<span className="px-1.5 font-mono text-xs font-bold">
						{entry.quantity}
					</span>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						className="h-11 w-11 p-0 sm:h-6 sm:w-6"
						aria-label={`Aumentar ${name}`}
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
