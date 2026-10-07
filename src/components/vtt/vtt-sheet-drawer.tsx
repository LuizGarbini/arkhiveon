import { Dices, Heart, Shield, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { DiceRollOverlay } from "@/components/dice-roll-overlay";
import { Button } from "@/components/ui/button";
import { abilityModifier, formatModifier, useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import { SYSTEM_CONFIG } from "@/lib/systems";
import { cn } from "@/lib/utils";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const chipClass =
	"inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] cursor-pointer touch-manipulation";

interface VTTSheetDrawerProps {
	onUpdateToken: (tokenId: string, updates: Partial<VTTToken>) => Promise<void>;
}

export function VTTSheetDrawer({ onUpdateToken }: VTTSheetDrawerProps) {
	const showCharacterSheetId = useVTTStore((s) => s.showCharacterSheetId);
	const setShowCharacterSheetId = useVTTStore((s) => s.setShowCharacterSheetId);
	const tokens = useVTTStore((s) => s.tokens);
	const characters = useRPGStore((s) => s.characters);

	const token = useMemo(
		() => tokens.find((t) => t.id === showCharacterSheetId) ?? null,
		[tokens, showCharacterSheetId],
	);

	const character = useMemo(
		() =>
			characters.find(
				(c) => c.id === showCharacterSheetId || c.id === token?.characterId,
			) ?? null,
		[characters, showCharacterSheetId, token?.characterId],
	);

	const isOpen = Boolean(showCharacterSheetId);
	const config = character
		? (SYSTEM_CONFIG[character.system] ?? SYSTEM_CONFIG.dnd5e)
		: SYSTEM_CONFIG.dnd5e;
	const [rollState, setRollState] = useState<{
		open: boolean;
		label: string;
		modifier: number;
		diceType: "d20" | "d100" | "d10" | "d6";
	}>({ open: false, label: "", modifier: 0, diceType: "d20" });
	const [lastRoll, setLastRoll] = useState<string | null>(null);

	const rollLabel = rollState.label;
	const rollModifier = rollState.modifier;
	const handleRollComplete = useCallback(
		(natural: number) => {
			const signed =
				rollModifier === 0
					? ""
					: ` ${rollModifier > 0 ? "+" : "−"} ${Math.abs(rollModifier)}`;
			setLastRoll(
				`${rollLabel}: ${natural}${signed} = ${natural + rollModifier}`,
			);
		},
		[rollLabel, rollModifier],
	);
	const handleRollClose = useCallback(
		() =>
			setRollState({ open: false, label: "", modifier: 0, diceType: "d20" }),
		[],
	);
	return (
		<>
			<aside
				className="t-panel-slide-x pointer-events-none absolute bottom-4 right-3 top-32 z-40 w-[min(100%-1.5rem,22rem)]"
				data-open={isOpen}
				aria-label="Ficha na mesa"
				aria-hidden={!isOpen}
				inert={!isOpen}
			>
				{isOpen && token ? (
					<SheetBody
						tokenId={token.id}
						character={character}
						tokenName={token.name}
						hpCurrent={token.hpCurrent ?? character?.health ?? 0}
						hpMax={token.hpMax ?? character?.healthMax ?? 0}
						armorClass={character?.armorClass ?? 10}
						lastRoll={lastRoll}
						onClose={() => setShowCharacterSheetId(null)}
						onUpdateToken={onUpdateToken}
						onStartRoll={(label, modifier) =>
							setRollState({
								open: true,
								label,
								modifier,
								diceType: config.defaultDice || "d20",
							})
						}
					/>
				) : null}
			</aside>
			<DiceRollOverlay
				open={rollState.open}
				attributeLabel={rollState.label}
				diceType={rollState.diceType}
				modifier={rollState.modifier}
				onComplete={handleRollComplete}
				onClose={handleRollClose}
			/>
		</>
	);
}

function SheetBody({
	tokenId,
	character,
	tokenName,
	hpCurrent,
	hpMax,
	armorClass,
	lastRoll,
	onClose,
	onUpdateToken,
	onStartRoll,
}: {
	tokenId: string;
	character: Character | null;
	tokenName: string;
	hpCurrent: number;
	hpMax: number;
	armorClass: number;
	lastRoll: string | null;
	onClose: () => void;
	onUpdateToken: VTTSheetDrawerProps["onUpdateToken"];
	onStartRoll: (label: string, modifier: number) => void;
}) {
	const config = character
		? (SYSTEM_CONFIG[character.system] ?? SYSTEM_CONFIG.dnd5e)
		: SYSTEM_CONFIG.dnd5e;

	const hpRatio = hpMax > 0 ? Math.max(0, Math.min(1, hpCurrent / hpMax)) : 0;

	const handleModifyHp = (delta: number) => {
		const next = Math.max(
			0,
			Math.min(hpCurrent + delta, hpMax || hpCurrent + delta),
		);
		void onUpdateToken(tokenId, { hpCurrent: next });
	};

	return (
		<div className="pointer-events-auto flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 text-foreground shadow-2xl backdrop-blur-md">
			<div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
				<div className="min-w-0">
					<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
						Ficha na mesa
					</p>
					<h3 className="font-display truncate text-sm font-bold">
						{character?.characterName || tokenName}
					</h3>
					<p className="truncate text-[11px] text-muted-foreground">
						{character
							? `${character.class || config.label} · Nv. ${character.level || 1}`
							: "Token sem ficha vinculada"}
					</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] cursor-pointer"
					title="Fechar ficha"
					aria-label="Fechar ficha"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			<div className="flex-1 space-y-4 overflow-y-auto p-4">
				<div className="space-y-2 rounded-xl border border-border/70 bg-background/55 p-3">
					<div className="flex items-center justify-between text-xs font-bold">
						<span className="flex items-center gap-1.5 text-primary">
							<Heart className="h-3.5 w-3.5" />
							Pontos de vida
						</span>
						<span className="font-mono">
							{hpCurrent} / {hpMax}
						</span>
					</div>
					<div className="h-2 overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-primary transition-[width] duration-150"
							style={{ width: `${hpRatio * 100}%` }}
						/>
					</div>
					<div className="grid grid-cols-4 gap-1.5">
						{[-5, -1, 1, 5].map((delta) => (
							<button
								type="button"
								key={delta}
								onClick={() => handleModifyHp(delta)}
								className={cn(
									chipClass,
									"min-h-[44px] border-border/70 bg-background/80 font-mono",
									delta < 0
										? "text-destructive hover:bg-destructive/10"
										: "text-primary hover:bg-primary/10",
								)}
							>
								{delta > 0 ? `+${delta}` : delta}
							</button>
						))}
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<div className="rounded-xl border border-border/70 bg-background/55 p-3">
						<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							CA
						</p>
						<p className="font-display flex items-center gap-1.5 text-lg font-bold">
							<Shield className="h-4 w-4 text-primary" />
							{armorClass}
						</p>
					</div>
					<div className="rounded-xl border border-border/70 bg-background/55 p-3">
						<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							Desloc.
						</p>
						<p className="font-display text-lg font-bold">
							{character?.speed ?? 9}
							{config.speedUnit ? ` ${config.speedUnit}` : ""}
						</p>
					</div>
				</div>

				<div className="space-y-2">
					<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						Rolagens na mesa
					</p>
					<div className="grid grid-cols-3 gap-1.5">
						{config.attributes.map((attr) => {
							const score = Number(
								character?.[attr.key as keyof Character] ?? 10,
							);
							const mod = abilityModifier(score);
							return (
								<button
									type="button"
									key={attr.key}
									onClick={() => onStartRoll(attr.label, mod)}
									className={cn(
										chipClass,
										"h-auto min-h-14 flex-col border-border/70 bg-background/70 py-2 hover:border-primary/40 hover:bg-primary/10",
									)}
								>
									<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
										{attr.label}
									</span>
									<span className="font-mono text-sm font-bold">
										{formatModifier(mod)}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</div>

			<div className="space-y-2 border-t border-border/60 px-4 py-3">
				{lastRoll ? (
					<p
						aria-live="polite"
						className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 font-mono text-xs font-semibold tabular-nums text-foreground"
					>
						{lastRoll}
					</p>
				) : null}
				<Button
					type="button"
					variant="outline"
					className="h-[44px] w-full gap-2"
					onClick={() => onStartRoll("Teste livre", 0)}
				>
					<Dices className="h-4 w-4" />
					Rolar {config.defaultDice || "d20"}
				</Button>
			</div>
		</div>
	);
}
