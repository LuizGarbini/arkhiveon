import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { Feat, Spell } from "@/lib/store";
import { cn } from "@/lib/utils";

export function QuickStat({
	label,
	value,
	color,
	compactValue = false,
}: {
	label: string;
	value: string;
	color: string;
	/** Valor longo (ex.: `33/38`) na faixa de 4 colunas da ficha na mesa. */
	compactValue?: boolean;
}) {
	// Célula da faixa de status `<dl>` (2×2 no celular, 4 colunas a partir de sm).
	return (
		<div className="min-w-0 bg-background px-2 py-3 text-center sm:py-4">
			<dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
				{label}
			</dt>
			<dd
				className={cn(
					"mt-1.5 truncate font-display font-bold leading-none tabular-nums",
					compactValue ? "text-base sm:text-lg" : "text-xl sm:text-2xl",
					color,
				)}
			>
				{value}
			</dd>
		</div>
	);
}

export function InfoRow({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-semibold text-foreground">{value}</span>
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
		<div className="rounded-xl border border-border/60 bg-background/40 p-3">
			<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
				{title}
			</p>
			{value ? (
				<p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground/90 font-medium">
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
		<div className="border border-border/40 rounded-lg bg-background/25 overflow-hidden transition-all">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center justify-between p-3 text-left hover:bg-background/40 transition-colors cursor-pointer"
			>
				<div>
					<span className="font-semibold text-sm text-foreground">
						{spell.name}
					</span>
					{spell.is_homebrew && (
						<span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">
							Homebrew
						</span>
					)}
					<span className="text-[11px] text-muted-foreground ml-2">
						{spell.school || "Geral"}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">
						{spell.casting_time || "1 ação"}
					</span>
					{expanded ? (
						<ChevronUp className="h-4 w-4 text-muted-foreground" />
					) : (
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					)}
				</div>
			</button>

			{expanded && (
				<div className="p-3 border-t border-border/40 bg-background/10 space-y-3 text-[12px] leading-relaxed">
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
		<div className="border border-border/40 rounded-lg bg-background/25 overflow-hidden transition-all">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center justify-between p-3 text-left hover:bg-background/40 transition-colors cursor-pointer"
			>
				<div>
					<span className="font-semibold text-sm text-foreground">
						{feat.name}
					</span>
					{feat.is_homebrew && (
						<span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">
							Homebrew
						</span>
					)}
					<span className="text-[11px] text-muted-foreground ml-2">
						({feat.category || "Geral"})
					</span>
				</div>
				<div className="flex items-center gap-2">
					{feat.ability_increase && (
						<span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">
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
				<div className="p-3 border-t border-border/40 bg-background/10 space-y-3 text-[12px] leading-relaxed">
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
