import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { Feat, Spell } from "@/lib/store";
import { cn } from "@/lib/utils";

export function QuickStat({
	label,
	value,
	color,
}: {
	label: string;
	value: string;
	color: string;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/50 p-4 text-center">
			<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
				{label}
			</p>
			<p
				className={cn(
					"font-display mt-2 text-2xl font-bold leading-none sm:text-3xl",
					color,
				)}
			>
				{value}
			</p>
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
