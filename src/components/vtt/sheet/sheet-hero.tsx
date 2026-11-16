import { Button } from "@/components/ui/button";
import type { Character } from "@/lib/store";
import { cn } from "@/lib/utils";
import { conditionDef } from "@/lib/vtt/conditions";
import { ArcaneShieldGlyph, ArcaneSparkGlyph } from "./sheet-icons";

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
		<ul aria-label="Condições" className="flex flex-wrap gap-1.5">
			{shown.map((id) => (
				<li
					key={id}
					className="rounded-md border border-white/[0.08] bg-black/35 px-2 py-0.5 text-[11px] font-medium text-foreground/90 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]"
				>
					{conditionDef(id).label}
				</li>
			))}
			{extra > 0 ? (
				<li className="rounded-md border border-white/[0.08] bg-black/35 px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground tabular-nums">
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
				"group relative flex size-9 shrink-0 cursor-pointer select-none items-center justify-center rounded-lg border backdrop-blur-md transition-[background-color,border-color,transform] duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default [@media(pointer:coarse)]:size-11",
				has
					? "border-primary/65 bg-background/85 text-primary shadow-[0_4px_12px_oklch(0_0_0/0.45),inset_0_1px_0_oklch(1_0_0/0.08)]"
					: "border-white/[0.12] bg-background/80 text-muted-foreground shadow-[0_4px_12px_oklch(0_0_0/0.4)] hover:bg-background/95 hover:text-foreground",
			)}
		>
			<ArcaneSparkGlyph active={has} className="t-icon-spring size-4" />
			{count > 1 ? (
				<span className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full border border-primary/40 bg-background/95 px-1 text-center font-mono text-[10px] font-semibold text-primary shadow-xs tabular-nums">
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
		<header className="relative space-y-2.5">
			<div className="flex items-center gap-3 @[44rem]:flex-col @[44rem]:items-stretch @[44rem]:gap-3">
				<div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-white/[0.1] bg-gradient-to-br from-primary/20 to-card ring-1 ring-inset ring-white/10 after:pointer-events-none after:absolute after:inset-0 after:bg-linear-to-t after:from-black/35 after:via-transparent after:to-transparent @[44rem]:aspect-[5/4] @[44rem]:size-auto @[44rem]:w-full @[44rem]:rounded-xl">
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
					<h2 className="truncate font-display text-[1.125rem] leading-tight font-semibold tracking-tight text-foreground @[44rem]:text-[1.25rem]">
						{character.characterName}
					</h2>
					{summary ? (
						<p className="mt-0.5 truncate text-xs text-muted-foreground">
							{summary}
						</p>
					) : null}
					{character.playerName ? (
						<p className="mt-0.5 hidden text-[11.5px] text-muted-foreground/85 @[44rem]:block">
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
							className="group size-9 shrink-0 rounded-lg border-white/[0.12] bg-background/80 backdrop-blur-md shadow-[0_4px_12px_oklch(0_0_0/0.4)] hover:border-primary/45 hover:bg-background/95 hover:text-primary [@media(pointer:coarse)]:size-11"
						>
							<ArcaneShieldGlyph className="t-icon-spring size-4" />
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
			className="relative flex min-h-11 w-full cursor-pointer select-none items-center gap-2.5 overflow-hidden rounded-xl border border-border/60 bg-background/45 px-2.5 py-1.5 text-left shadow-2xs transition-colors hover:border-border/90 hover:bg-background/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
		>
			<span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/40 ring-1 ring-border/70">
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
			<span className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold tracking-tight">
				{character.characterName}
			</span>
			<span
				className={cn(
					"shrink-0 font-mono text-xs font-semibold tabular-nums",
					low ? "text-destructive" : "text-muted-foreground",
				)}
			>
				{hpLabel} PV
			</span>
			<span
				aria-hidden
				className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-muted/80"
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
