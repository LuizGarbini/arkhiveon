import { Info, Swords } from "lucide-react";
import {
	type PointerEvent,
	type ReactNode,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	calculateProficiencyBonus,
	DAMAGE_TYPE_LABELS,
	type DamagePart,
	formatDamageFormula,
	formatModifier,
	getEquippedWeaponAttacks,
	type WeaponAttack,
} from "@/core/rules";
import type { Character } from "@/lib/store";
import type { DamageType } from "@/lib/store/types";
import { cn } from "@/lib/utils";

/** Mapa tipo → cor do mock aprovado (Designer, shadcn 2026-10-10). Demais tipos ficam neutros. */
const TYPE_TONE: Partial<Record<DamageType, string>> = {
	lightning: "border-sky-500/20 bg-sky-500/10 text-sky-300",
	poison: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
};
const NEUTRAL_TONE = "border-border/60 bg-muted text-muted-foreground";

function DamageTypeTag({ type }: { type: DamageType }) {
	return (
		<span
			className={cn(
				"rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
				TYPE_TONE[type] ?? NEUTRAL_TONE,
			)}
		>
			{DAMAGE_TYPE_LABELS[type]}
		</span>
	);
}

function partValue(part: DamagePart): string {
	if (part.dice.length === 0) return formatModifier(part.flat);
	return formatDamageFormula(part.dice, part.flat);
}

const numberTrigger =
	"rounded-lg px-1 -mx-1 text-left font-display text-xl font-bold tabular-nums text-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 transition-colors select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11 sm:min-h-0 hover:text-primary";

const MOBILE_QUERY = "(max-width: 639px)";

function subscribeMobile(onChange: () => void) {
	const mql = window.matchMedia(MOBILE_QUERY);
	mql.addEventListener("change", onChange);
	return () => mql.removeEventListener("change", onChange);
}

function useIsMobile() {
	return useSyncExternalStore(
		subscribeMobile,
		() => window.matchMedia(MOBILE_QUERY).matches,
		() => false,
	);
}

/** Arrastar para baixo além disso fecha o sheet. */
const DRAG_CLOSE_PX = 80;

/**
 * Detalhe do número: Popover do DS no desktop; no mobile, Dialog do DS ancorado
 * embaixo (sheet), sem X. Fecha tocando fora (overlay), arrastando para baixo ou Esc.
 */
function BreakdownSurface({
	triggerText,
	triggerLabel,
	title,
	subtitle,
	children,
}: {
	triggerText: string;
	triggerLabel: string;
	title: string;
	subtitle: string;
	children: ReactNode;
}) {
	const isMobile = useIsMobile();
	const [open, setOpen] = useState(false);
	const [dragY, setDragY] = useState(0);
	const dragStart = useRef<number | null>(null);

	if (!isMobile) {
		return (
			<Popover>
				<PopoverTrigger className={numberTrigger} aria-label={triggerLabel}>
					{triggerText}
				</PopoverTrigger>
				<PopoverContent align="start" className="w-80 gap-3">
					<div>
						<p className="font-semibold text-foreground">{title}</p>
						<p className="text-xs text-muted-foreground">{subtitle}</p>
					</div>
					{children}
				</PopoverContent>
			</Popover>
		);
	}

	const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
		dragStart.current = e.clientY;
		e.currentTarget.setPointerCapture(e.pointerId);
	};
	const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
		if (dragStart.current === null) return;
		setDragY(Math.max(0, e.clientY - dragStart.current));
	};
	const onPointerEnd = () => {
		if (dragStart.current === null) return;
		dragStart.current = null;
		if (dragY > DRAG_CLOSE_PX) setOpen(false);
		setDragY(0);
	};

	return (
		<>
			<button
				type="button"
				className={numberTrigger}
				aria-label={triggerLabel}
				onClick={() => setOpen(true)}
			>
				{triggerText}
			</button>
			<Dialog
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (!next) setDragY(0);
				}}
			>
				<DialogContent
					showCloseButton={false}
					style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
					className={cn(
						"top-auto bottom-0 left-0 max-h-[85dvh] max-w-full translate-x-0 translate-y-0 gap-3 overflow-y-auto rounded-b-none rounded-t-2xl px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] data-open:slide-in-from-bottom-4 data-open:zoom-in-100 data-closed:zoom-out-100",
						dragY === 0 && "transition-transform duration-150",
					)}
				>
					<div
						className="-mx-4 -mt-2 flex h-8 cursor-grab touch-none items-center justify-center select-none"
						onPointerDown={onPointerDown}
						onPointerMove={onPointerMove}
						onPointerUp={onPointerEnd}
						onPointerCancel={onPointerEnd}
						aria-hidden="true"
					>
						<span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
					</div>
					<div>
						<DialogTitle className="font-semibold text-foreground">
							{title}
						</DialogTitle>
						<DialogDescription className="text-xs">
							{subtitle}
						</DialogDescription>
					</div>
					{children}
				</DialogContent>
			</Dialog>
		</>
	);
}

function AttackBreakdown({ attack }: { attack: WeaponAttack }) {
	return (
		<BreakdownSurface
			triggerText={formatModifier(attack.attackBonus)}
			triggerLabel={`Acerto ${formatModifier(attack.attackBonus)}: ver a conta`}
			title={`Acerto ${formatModifier(attack.attackBonus)}`}
			subtitle={attack.name}
		>
			<ul className="divide-y divide-border/50 text-xs">
				{attack.attackParts.map((part) => (
					<li
						key={part.label}
						className="flex items-center justify-between gap-3 py-2"
					>
						<span className="text-muted-foreground">{part.label}</span>
						<span className="font-semibold tabular-nums text-foreground">
							{formatModifier(part.value)}
						</span>
					</li>
				))}
			</ul>
		</BreakdownSurface>
	);
}

function DamageBreakdown({ attack }: { attack: WeaponAttack }) {
	const excluded = attack.damageParts.filter(
		(p) => p.excluded && p.origin === "extra",
	);
	return (
		<BreakdownSurface
			triggerText={attack.formula}
			triggerLabel={`Dano ${attack.formula}: ver a conta`}
			title={`Dano ${attack.formula}`}
			subtitle={`${attack.name} · média ${attack.average.toLocaleString("pt-BR")}`}
		>
			<ul className="divide-y divide-border/50 text-xs">
				{attack.damageParts.map((part, i) => (
					<li
						key={`${part.origin}-${i}`}
						className={cn(
							"grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2",
							part.excluded && "opacity-60",
						)}
					>
						<span
							className={cn(
								"truncate text-muted-foreground",
								part.excluded && "line-through",
							)}
						>
							{part.origin === "weapon" ? "Dado da arma" : part.label}
						</span>
						<span className="font-semibold tabular-nums text-foreground">
							{partValue(part)}
						</span>
						<DamageTypeTag type={part.type} />
					</li>
				))}
			</ul>
			{excluded.length > 0 && (
				<p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
					<Info className="mt-0.5 h-3 w-3 shrink-0" />
					{excluded.map((p) => p.label).join(", ")} está em +0, não entra no
					total.
				</p>
			)}
			<div className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2 text-xs">
				<span className="text-muted-foreground">Por tipo</span>
				<span className="text-right font-semibold tabular-nums text-foreground">
					{attack.byType
						.map((t) => `${DAMAGE_TYPE_LABELS[t.type]} ${t.formula}`)
						.join(" · ")}
				</span>
			</div>
		</BreakdownSurface>
	);
}

/**
 * D&D 5e: ataques derivados das armas equipadas no inventário.
 * Sem arma equipada com dano cadastrado, não mostra número nenhum.
 */
export function WeaponAttacksSection({ character }: { character: Character }) {
	const proficiencyBonus =
		character.proficiencyBonus ||
		calculateProficiencyBonus(character.level || 1);
	const attacks = useMemo(
		() =>
			getEquippedWeaponAttacks(
				character.inventoryList,
				{
					strength: Number(character.strength) || 10,
					dexterity: Number(character.dexterity) || 10,
				},
				proficiencyBonus,
			),
		[
			character.inventoryList,
			character.strength,
			character.dexterity,
			proficiencyBonus,
		],
	);

	return (
		<div className="space-y-3 border-t border-border/40 pt-4">
			<h4 className="flex items-center gap-1.5 font-display text-sm font-bold text-foreground">
				<Swords className="h-4 w-4 text-primary" />
				Ataques
				{attacks.length > 0 && (
					<span className="font-sans text-xs font-normal text-muted-foreground">
						({attacks.length})
					</span>
				)}
			</h4>

			{attacks.length === 0 ? (
				<p className="text-xs italic text-muted-foreground">
					Nenhuma arma equipada com dano cadastrado. No inventário, marque o
					item como Arma, preencha o dano e deixe-o "No Corpo".
				</p>
			) : (
				<div className="grid gap-2">
					{attacks.map((attack) => (
						<div
							key={attack.itemId}
							className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border/60 bg-background/40 p-3 sm:grid-cols-[1fr_auto_minmax(9rem,auto)] sm:items-center"
						>
							<div className="col-span-2 min-w-0 sm:col-span-1">
								<p className="truncate text-sm font-semibold text-foreground">
									{attack.name}
								</p>
							</div>
							<div>
								<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
									Acerto
								</p>
								<AttackBreakdown attack={attack} />
							</div>
							<div>
								<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
									Dano
								</p>
								<DamageBreakdown attack={attack} />
								<div className="mt-1 flex flex-wrap gap-1">
									{attack.types.map((type) => (
										<DamageTypeTag key={type} type={type} />
									))}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
