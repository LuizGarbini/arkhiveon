import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { Feat, Spell } from "@/lib/store";
import { cn } from "@/lib/utils";

export function QuickStat({
	label,
	value,
	color,
	compactValue = false,
	page = false,
}: {
	label: string;
	value: string;
	color: string;
	/** Valor longo (ex.: `33/38`) na faixa de 4 colunas da ficha na mesa. */
	compactValue?: boolean;
	page?: boolean;
}) {
	// Célula da faixa de status `<dl>` (2×2 no celular, 4 colunas a partir de sm).
	return (
		<div
			className={cn(
				"min-w-0",
				page
					? "py-3.5 text-left"
					: "bg-background px-2 py-3 text-center sm:py-4",
			)}
		>
			<dt
				className={cn(
					"text-muted-foreground",
					page
						? "text-xs font-medium"
						: "text-[10px] font-bold uppercase tracking-[0.2em]",
				)}
			>
				{label}
			</dt>
			<dd
				className={cn(
					"mt-1.5 font-display font-bold leading-none tabular-nums",
					page ? "text-xl sm:text-2xl" : "truncate",
					!page &&
						(compactValue ? "text-base sm:text-lg" : "text-xl sm:text-2xl"),
					color,
				)}
			>
				{value}
			</dd>
		</div>
	);
}

export type OriginChipModel = {
	text: string;
	label: string;
	/** Quando os três existem, só o nome trunca. */
	prefix?: string;
	name?: string;
	modifier?: string;
};

/** Chip de origem. Prefixo e valor não encolhem; o nome do item trunca. */
export function OriginChipItem({
	text,
	label,
	prefix,
	name,
	modifier,
	className,
}: OriginChipModel & { className?: string }) {
	const split =
		prefix !== undefined && name !== undefined && modifier !== undefined;
	return (
		<li
			title={label}
			aria-label={label}
			className={cn(
				"max-w-full min-w-0 rounded-full border px-2 py-0.5 font-semibold text-muted-foreground tabular-nums",
				split ? "flex items-baseline gap-1" : "truncate",
				className,
			)}
		>
			{split ? (
				<>
					<span className="shrink-0">{prefix}</span>
					<span className="min-w-0 truncate">{name}</span>
					<span className="shrink-0 tabular-nums">{modifier}</span>
				</>
			) : (
				text
			)}
		</li>
	);
}

export function InfoRow({
	label,
	value,
	notes,
}: {
	label: string;
	value: string | number;
	/** Chips de origem. O texto completo fica no title e no aria-label. */
	notes?: ReadonlyArray<string | OriginChipModel>;
}) {
	const seen = new Map<string, number>();
	const originNotes = (notes ?? []).map((note) => {
		const text = typeof note === "string" ? note : note.text;
		const labelText = typeof note === "string" ? note : note.label;
		const count = (seen.get(labelText) ?? 0) + 1;
		seen.set(labelText, count);
		return {
			key: count === 1 ? labelText : `${labelText}#${count}`,
			text,
			label: labelText,
			prefix: typeof note === "string" ? undefined : note.prefix,
			name: typeof note === "string" ? undefined : note.name,
			modifier: typeof note === "string" ? undefined : note.modifier,
		};
	});
	return (
		<div className="min-w-0 border-b border-border/50 py-2.5 text-sm">
			<div className="flex min-w-0 items-baseline justify-between gap-x-3 gap-y-1 max-[360px]:flex-wrap">
				<span className="min-w-0 text-muted-foreground">{label}</span>
				<span className="min-w-0 text-right font-medium text-foreground tabular-nums [overflow-wrap:anywhere]">
					{value}
				</span>
			</div>
			{originNotes.length > 0 ? (
				<ul className="mt-1.5 flex w-full min-w-0 max-w-full flex-col items-start gap-1">
					{originNotes.map((note) => (
						<OriginChipItem
							key={note.key}
							text={note.text}
							label={note.label}
							prefix={note.prefix}
							name={note.name}
							modifier={note.modifier}
							className="border-border/70 bg-card/60 text-[11px]"
						/>
					))}
				</ul>
			) : null}
		</div>
	);
}

export function TextBlock({
	title,
	value,
	children,
}: {
	title: string;
	value?: string;
	children?: ReactNode;
}) {
	return (
		<div className="min-w-0 space-y-1.5">
			<p className="text-sm font-medium text-muted-foreground">{title}</p>
			{value ? (
				<p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
					{value}
				</p>
			) : (
				children
			)}
		</div>
	);
}

export function SpellRow({ spell }: { spell: Spell }) {
	const [expanded, setExpanded] = useState(false);
	return (
		<div className="min-w-0 border-b border-border/50">
			<button
				type="button"
				aria-expanded={expanded}
				onClick={() => setExpanded(!expanded)}
				className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
			>
				<div>
					<span className="font-semibold text-sm text-foreground">
						{spell.name}
					</span>
					{spell.is_homebrew && (
						<span className="shrink-0 ml-2 text-xs text-muted-foreground">
							Homebrew
						</span>
					)}
					{spell.school && (
						<p className="text-xs text-muted-foreground">{spell.school}</p>
					)}
				</div>
				<div className="flex items-center gap-2">
					{spell.casting_time && (
						<span className="text-right text-xs text-muted-foreground">
							{spell.casting_time}
						</span>
					)}
					{expanded ? (
						<ChevronUp className="h-4 w-4 text-muted-foreground" />
					) : (
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					)}
				</div>
			</button>

			{expanded && (
				<div className="space-y-3 px-2 pb-3 pt-1 text-sm leading-relaxed">
					<div className="grid grid-cols-2 gap-2 text-muted-foreground border-b border-border/20 pb-2">
						<div>
							<span className="font-bold">Alcance: </span>
							{spell.range || "-"}
						</div>
						<div>
							<span className="font-bold">Duração: </span>
							{spell.duration || "-"}
						</div>
						<div className="col-span-2">
							<span className="font-bold">Componentes: </span>
							{spell.components || "-"}
						</div>
					</div>
					<p className="text-muted-foreground whitespace-pre-line">
						{spell.description}
					</p>
				</div>
			)}
		</div>
	);
}

export function FeatRow({ feat }: { feat: Feat }) {
	const [expanded, setExpanded] = useState(false);
	return (
		<div className="min-w-0 border-b border-border/50">
			<button
				type="button"
				aria-expanded={expanded}
				onClick={() => setExpanded(!expanded)}
				className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
			>
				<div>
					<span className="font-semibold text-sm text-foreground">
						{feat.name}
					</span>
					{feat.is_homebrew && (
						<span className="shrink-0 ml-2 text-xs text-muted-foreground">
							Homebrew
						</span>
					)}
					{feat.category && (
						<p className="text-xs text-muted-foreground">{feat.category}</p>
					)}
				</div>
				<div className="flex items-center gap-2">
					{feat.ability_increase && (
						<span className="text-right text-xs font-medium text-muted-foreground">
							{feat.ability_increase}
						</span>
					)}
					{expanded ? (
						<ChevronUp className="h-4 w-4 text-muted-foreground" />
					) : (
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					)}
				</div>
			</button>

			{expanded && (
				<div className="space-y-3 px-2 pb-3 pt-1 text-sm leading-relaxed">
					<div className="grid grid-cols-2 gap-2 text-muted-foreground border-b border-border/20 pb-2">
						{feat.prerequisites && (
							<div className="col-span-2">
								<span className="font-bold">Pré-requisito: </span>
								{feat.prerequisites}
							</div>
						)}
						{feat.source && (
							<div>
								<span className="font-bold">Fonte: </span>
								{feat.source}
							</div>
						)}
					</div>
					<p className="text-muted-foreground whitespace-pre-line">
						{feat.description}
					</p>
				</div>
			)}
		</div>
	);
}
