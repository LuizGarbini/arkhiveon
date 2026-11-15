import { Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Character } from "@/lib/store";
import { cn } from "@/lib/utils";
import { conditionDef } from "@/lib/vtt/conditions";

/** "DD" para "Dante Diavolo": o retrato quando não há imagem. */
export function monogram(name: string): string {
	const letters = name
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
	return letters || "?";
}

const MAX_CONDITION_CHIPS = 4;

/** Etiquetas das condições do token ("Envenenado", "Concentração"…). */
export function ConditionChips({
	conditions,
}: {
	conditions: readonly string[];
}) {
	if (conditions.length === 0) return null;
	const shown = conditions.slice(0, MAX_CONDITION_CHIPS);
	const extra = conditions.length - shown.length;
	return (
		<ul aria-label="Condições" className="flex flex-wrap gap-1">
			{shown.map((id) => (
				<li
					key={id}
					className="rounded-full bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-foreground/90"
				>
					{conditionDef(id).label}
				</li>
			))}
			{extra > 0 ? (
				<li className="rounded-full bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
					+{extra}
				</li>
			) : null}
		</ul>
	);
}

/** Estrela de Inspiração: cheia quando há; um toque gasta (ou concede, ao mestre). */
function InspirationStar({
	count,
	canSpend,
	canGrant,
	onChange,
}: {
	count: number;
	canSpend: boolean;
	canGrant: boolean;
	onChange: (next: number) => void;
}) {
	const has = count > 0;
	const interactive = has ? canSpend : canGrant;
	return (
		<button
			type="button"
			disabled={!interactive}
			aria-label={
				has
					? `Inspiração: ${count}. Usar uma`
					: canGrant
						? "Sem inspiração. Conceder uma"
						: "Sem inspiração"
			}
			aria-pressed={has}
			onClick={() => onChange(has ? count - 1 : 1)}
			className={cn(
				"relative flex size-9 shrink-0 cursor-pointer select-none items-center justify-center rounded-xl border transition-[background-color,transform] duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default [@media(pointer:coarse)]:size-11",
				has
					? "border-primary/45 bg-primary/15 text-primary"
					: "border-border/70 text-muted-foreground",
			)}
		>
			<Star className={cn("size-4", has && "fill-primary")} aria-hidden />
			{count > 1 ? (
				<span className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-primary px-1 text-center text-[10.5px] font-bold text-primary-foreground tabular-nums">
					{count}
				</span>
			) : null}
		</button>
	);
}

/**
 * Cabeçalho da ficha na mesa: retrato, nome, inspiração e condições. Na janela
 * larga o retrato vira o topo de uma coluna à esquerda.
 */
export function SheetHero({
	character,
	portraitUrl,
	conditions,
	inspiration,
	canEditInspiration,
	canGrantInspiration,
	onInspirationChange,
	onOpenEquipment,
}: {
	character: Character;
	/** Vazio quando a imagem não existe ou não pode ser vista por quem olha. */
	portraitUrl: string;
	conditions: readonly string[];
	inspiration: number;
	canEditInspiration: boolean;
	canGrantInspiration: boolean;
	onInspirationChange: (next: number) => void;
	/** Só D&D 5e: abre o equipamento e a build. */
	onOpenEquipment?: () => void;
}) {
	const summary = [
		character.race,
		character.class,
		character.level ? `Nível ${character.level}` : null,
	]
		.filter(Boolean)
		.join(" · ");
	return (
		<header className="relative space-y-2">
			<div className="flex items-center gap-3 @[44rem]:flex-col @[44rem]:items-stretch @[44rem]:gap-3">
				<div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-primary/35 to-card @[44rem]:aspect-[5/4] @[44rem]:size-auto @[44rem]:w-full @[44rem]:rounded-2xl">
					{portraitUrl ? (
						<img
							src={portraitUrl}
							alt=""
							draggable={false}
							className="size-full object-cover"
						/>
					) : (
						<span
							aria-hidden
							className="flex size-full items-center justify-center font-display text-base font-semibold text-foreground/90 @[44rem]:text-5xl"
						>
							{monogram(character.characterName || "?")}
						</span>
					)}
				</div>
				<div className="min-w-0 flex-1 @[44rem]:flex-none">
					<h2 className="truncate font-display text-[1.125rem] leading-tight font-semibold text-foreground @[44rem]:text-[1.25rem]">
						{character.characterName}
					</h2>
					{summary ? (
						<p className="mt-0.5 truncate text-xs text-muted-foreground">
							{summary}
						</p>
					) : null}
					{character.playerName ? (
						<p className="mt-0.5 hidden text-xs text-muted-foreground @[44rem]:block">
							Jogador: {character.playerName}
						</p>
					) : null}
				</div>
				<div className="flex shrink-0 gap-1.5 @[44rem]:absolute @[44rem]:top-2 @[44rem]:right-2">
					<InspirationStar
						count={inspiration}
						canSpend={canEditInspiration}
						canGrant={canGrantInspiration}
						onChange={onInspirationChange}
					/>
					{onOpenEquipment ? (
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={onOpenEquipment}
							aria-label="Abrir equipamento e build"
							className="size-9 shrink-0 [@media(pointer:coarse)]:size-11"
						>
							<Shield className="size-4" aria-hidden />
						</Button>
					) : null}
				</div>
			</div>
			<ConditionChips conditions={conditions} />
		</header>
	);
}

/**
 * Barra fina que substitui o cabeçalho enquanto se rola o conteúdo: retrato
 * pequeno, nome e PV. Um toque devolve o cabeçalho completo.
 */
export function SheetCompactBar({
	character,
	portraitUrl,
	hpLabel,
	hpRatio,
	low,
	onExpand,
}: {
	character: Character;
	portraitUrl: string;
	hpLabel: string;
	hpRatio: number;
	low: boolean;
	onExpand: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onExpand}
			aria-label={`${character.characterName}, ${hpLabel} PV. Mostrar cabeçalho`}
			className="relative flex min-h-11 w-full cursor-pointer select-none items-center gap-2.5 overflow-hidden rounded-xl border border-border/70 bg-background/40 px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
		>
			<span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary/40 to-card ring-1 ring-border/70">
				{portraitUrl ? (
					<img
						src={portraitUrl}
						alt=""
						draggable={false}
						className="size-full object-cover"
					/>
				) : (
					<span
						aria-hidden
						className="font-display text-xs font-semibold text-foreground/90"
					>
						{monogram(character.characterName || "?")}
					</span>
				)}
			</span>
			<span className="min-w-0 flex-1 truncate font-display text-sm font-semibold">
				{character.characterName}
			</span>
			<span
				className={cn(
					"shrink-0 text-[13px] font-semibold tabular-nums",
					low && "text-destructive",
				)}
			>
				{hpLabel} PV
			</span>
			<span
				aria-hidden
				className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-muted"
			>
				<span
					className={cn(
						"block h-full transition-[width] duration-150",
						low ? "bg-destructive" : "bg-primary",
					)}
					style={{ width: `${Math.round(hpRatio * 100)}%` }}
				/>
			</span>
		</button>
	);
}
