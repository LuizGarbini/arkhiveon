import { AlertDialog } from "@base-ui/react/alert-dialog";
import { GripVertical } from "lucide-react";
import {
	type ReactNode,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { useIsMobile } from "@/components/character-sheet/view/number-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
	isValidInitiative,
	nextTurn,
	playerTurnView,
	previousTurn,
	visibleCombatants,
} from "@/lib/vtt/combat";
import {
	COMBAT_UNAVAILABLE_LABEL,
	selectOrderedCombatants,
	useCombatStore,
} from "@/lib/vtt/combat-store";
import { loadCombat, subscribeCombat } from "@/lib/vtt/combat-sync";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { InitiativePortrait } from "./initiative-portrait";

function InitiativeField({
	name,
	portrait,
	value,
	disabled,
	onCommit,
}: {
	name: string;
	portrait: ReactNode;
	value: number | null;
	disabled: boolean;
	onCommit: (value: number | null) => void;
}) {
	const fieldId = useId();
	const [draft, setDraft] = useState<string | null>(null);
	const shown = draft ?? (value === null ? "" : String(value));
	const commit = () => {
		if (draft === null || disabled) return;
		const raw = draft.trim();
		setDraft(null);
		if (raw === "") {
			onCommit(null);
			return;
		}
		const next = Number(raw);
		if (!Number.isInteger(next) || !isValidInitiative(next)) return;
		onCommit(next);
	};
	return (
		<form
			className="min-w-0 flex-1"
			onSubmit={(event) => {
				event.preventDefault();
				commit();
			}}
		>
			<label
				htmlFor={fieldId}
				className="flex min-h-11 min-w-0 flex-1 items-center gap-2"
			>
				{portrait}
				<span className="min-w-0 flex-1 truncate font-semibold text-foreground">
					{name}
				</span>
				<Input
					id={fieldId}
					aria-label={`Iniciativa de ${name}`}
					type="number"
					inputMode="numeric"
					min={-50}
					max={100}
					step={1}
					spellCheck={false}
					autoComplete="off"
					disabled={disabled}
					value={shown}
					onChange={(event) => setDraft(event.target.value)}
					onBlur={commit}
					className="h-11 w-16 min-w-16 shrink-0 px-1 text-center tabular-nums"
				/>
			</label>
		</form>
	);
}

function CombatPanelContent() {
	const status = useCombatStore((s) => s.status);
	const busy = useCombatStore((s) => s.busy);
	const round = useCombatStore((s) => s.round);
	const turnId = useCombatStore((s) => s.turnId);
	const ordered = useCombatStore(selectOrderedCombatants);
	const sceneId = useVTTStore((s) => s.activeSceneId);
	const tokens = useVTTStore((s) => s.tokens);
	const isGM = useVTTStore((s) => s.isGM);
	const selectedTokenIds = useVTTStore((s) => s.selectedTokenIds);
	const dragRef = useRef<string | null>(null);
	const [confirmEnd, setConfirmEnd] = useState(false);

	const visibleIds = useMemo(() => {
		const ids = new Set<string>();
		for (const token of tokens) {
			if (isGM || (token.layer !== "gm" && !token.isHidden)) ids.add(token.id);
		}
		return ids;
	}, [tokens, isGM]);
	const rows = useMemo(
		() => (isGM ? ordered : visibleCombatants(ordered, visibleIds)),
		[isGM, ordered, visibleIds],
	);
	const turnView = useMemo(
		() => playerTurnView({ round, turnId }, ordered, visibleIds),
		[round, turnId, ordered, visibleIds],
	);
	const tokenById = useMemo(() => {
		const map = new Map<string, VTTToken>();
		for (const token of tokens) map.set(token.id, token);
		return map;
	}, [tokens]);
	const inCombat = useMemo(
		() => new Set(ordered.map((c) => c.tokenId)),
		[ordered],
	);
	const canAdd = selectedTokenIds.some((id) => {
		if (inCombat.has(id)) return false;
		const token = tokens.find((item) => item.id === id);
		return Boolean(token && token.sceneId === sceneId);
	});
	const activeId = isGM
		? turnId
		: turnView.kind === "turn"
			? turnView.combatantId
			: null;
	const previousSame =
		round === null ||
		(() => {
			const prev = previousTurn({ round, turnId }, ordered);
			return prev.round === round && prev.turnId === turnId;
		})();
	const nextSame =
		round === null ||
		ordered.length === 0 ||
		(() => {
			const next = nextTurn({ round, turnId }, ordered);
			return next.round === round && next.turnId === turnId;
		})();

	if (status === "idle" || status === "loading") {
		return (
			<output
				data-testid="combat-panel"
				aria-busy="true"
				aria-label="Carregando combate"
				className="flex flex-col gap-2"
			>
				<Skeleton className="h-11 w-full" />
				<Skeleton className="h-11 w-full" />
				<Skeleton className="h-11 w-full" />
			</output>
		);
	}

	if (status === "unavailable") {
		return (
			<div data-testid="combat-panel" className="py-6">
				<Tooltip>
					<TooltipTrigger
						render={
							<p className="text-center text-sm text-muted-foreground">
								{COMBAT_UNAVAILABLE_LABEL}
							</p>
						}
					/>
					<TooltipContent>{COMBAT_UNAVAILABLE_LABEL}</TooltipContent>
				</Tooltip>
			</div>
		);
	}

	if (status === "error") {
		return (
			<div
				data-testid="combat-panel"
				role="alert"
				className="flex flex-col items-center gap-3 px-1 py-6 text-center"
			>
				<p className="text-sm text-muted-foreground">
					Não foi possível carregar o combate.
				</p>
				<Button
					type="button"
					className="h-11 min-h-11 px-4"
					onClick={() => {
						const id = useCombatStore.getState().sceneId;
						if (!id) return;
						useCombatStore.getState().setStatus("loading");
						void loadCombat(id);
					}}
				>
					Tentar de novo
				</Button>
			</div>
		);
	}

	return (
		<div
			data-testid="combat-panel"
			className="flex min-h-0 flex-1 flex-col gap-3"
		>
			{round !== null && (
				<p className="text-sm text-muted-foreground">
					Rodada <span className="tabular-nums text-foreground">{round}</span>
				</p>
			)}
			{!isGM && turnView.kind === "gm-turn" && (
				<p className="text-sm text-muted-foreground">Vez do mestre</p>
			)}
			{isGM && (
				<Button
					type="button"
					className="h-11 min-h-11 w-full"
					disabled={!canAdd || busy}
					onClick={() => {
						void useCombatStore.getState().addSelected();
					}}
				>
					Adicionar selecionados
				</Button>
			)}
			{rows.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 py-8 text-center">
					<p className="text-sm text-foreground">Ninguém na ordem.</p>
					{isGM && (
						<p className="text-sm text-muted-foreground">
							Selecione tokens no mapa e traga para a ordem.
						</p>
					)}
				</div>
			) : (
				<ul
					aria-label="Ordem de iniciativa"
					className="min-h-0 flex-1 overflow-y-auto"
				>
					{rows.map((combatant) => {
						const token = tokenById.get(combatant.tokenId);
						const name = token?.name ?? "Token";
						const portrait = (
							<InitiativePortrait name={name} token={token} isGM={isGM} />
						);
						const active = combatant.id === activeId;
						return (
							<li
								key={combatant.id}
								aria-label={name}
								aria-current={active ? "true" : undefined}
								className={cn(
									"flex min-h-11 items-center gap-1 border-b border-border/40 px-1 transition-colors duration-150 ease-out",
									active
										? "bg-primary/10"
										: "[@media(hover:hover)]:hover:bg-muted/60",
								)}
								onDragOver={(event) => {
									if (!isGM || busy) return;
									event.preventDefault();
								}}
								onDrop={(event) => {
									event.preventDefault();
									const from = dragRef.current;
									dragRef.current = null;
									if (!from || from === combatant.id) return;
									void useCombatStore.getState().reorder(from, combatant.id);
								}}
							>
								{isGM && (
									<button
										type="button"
										draggable={!busy}
										aria-label={`Reordenar ${name}`}
										className="flex size-11 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted-foreground select-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] [@media(hover:hover)]:hover:bg-muted [@media(hover:hover)]:hover:text-foreground"
										onDragStart={(event) => {
											dragRef.current = combatant.id;
											const transfer = event.dataTransfer;
											if (!transfer) return;
											transfer.effectAllowed = "move";
											transfer.setData("text/plain", combatant.id);
										}}
										onDragEnd={() => {
											dragRef.current = null;
										}}
									>
										<GripVertical className="size-4" />
									</button>
								)}
								{isGM ? (
									<InitiativeField
										name={name}
										portrait={portrait}
										value={combatant.initiative}
										disabled={busy}
										onCommit={(value) => {
											void useCombatStore
												.getState()
												.setInitiative(combatant.id, value);
										}}
									/>
								) : (
									<div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-2">
										{portrait}
										<span className="min-w-0 flex-1 truncate font-semibold text-foreground">
											{name}
										</span>
										<span className="tabular-nums text-foreground">
											{combatant.initiative === null
												? "—"
												: combatant.initiative}
										</span>
									</div>
								)}
							</li>
						);
					})}
				</ul>
			)}
			{isGM && round === null && rows.length > 0 && (
				<Button
					type="button"
					className="h-11 min-h-11 w-full"
					disabled={busy}
					onClick={() => {
						void useCombatStore.getState().start();
					}}
				>
					Iniciar combate
				</Button>
			)}
			{isGM && round !== null && (
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						className="h-11 min-h-11 flex-1 px-3"
						disabled={busy || previousSame}
						onClick={() => {
							void useCombatStore.getState().previous();
						}}
					>
						Anterior
					</Button>
					<Button
						type="button"
						className="h-11 min-h-11 flex-1 px-3"
						disabled={busy || nextSame}
						onClick={() => {
							void useCombatStore.getState().next();
						}}
					>
						Próximo
					</Button>
					<Button
						type="button"
						variant="destructive"
						className="h-11 min-h-11 flex-1 px-3"
						disabled={busy}
						onClick={() => setConfirmEnd(true)}
					>
						Encerrar
					</Button>
				</div>
			)}
			{isGM && (
				<AlertDialog.Root
					open={confirmEnd}
					onOpenChange={(open) => {
						if (!open) setConfirmEnd(false);
					}}
				>
					<AlertDialog.Portal>
						<AlertDialog.Backdrop className="fixed inset-0 isolate z-50 bg-black/60 backdrop-blur-md duration-150 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0" />
						<AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-border/70 bg-card-elevated p-6 text-sm shadow-2xl backdrop-blur-xl outline-none duration-150 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 sm:max-w-md">
							<AlertDialog.Title className="font-display text-lg font-semibold text-foreground">
								Encerrar combate?
							</AlertDialog.Title>
							<AlertDialog.Description className="text-sm text-muted-foreground">
								A rodada e a vez saem da mesa. A ordem dos tokens continua aqui.
							</AlertDialog.Description>
							<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
								<AlertDialog.Close
									render={
										<Button
											type="button"
											variant="ghost"
											className="h-11 min-h-11 px-4"
										/>
									}
								>
									Cancelar
								</AlertDialog.Close>
								<Button
									type="button"
									variant="destructive"
									className="h-11 min-h-11 px-4"
									disabled={busy}
									onClick={() => {
										void useCombatStore
											.getState()
											.end()
											.then((ok) => {
												if (ok) setConfirmEnd(false);
											});
									}}
								>
									Encerrar combate
								</Button>
							</div>
						</AlertDialog.Popup>
					</AlertDialog.Portal>
				</AlertDialog.Root>
			)}
		</div>
	);
}

export function VTTCombatPanel() {
	const sceneId = useVTTStore((s) => s.activeSceneId);
	const panelOpen = useCombatStore((s) => s.panelOpen);
	const isMobile = useIsMobile();

	useEffect(() => {
		// Único efeito do combate: assinar o canal realtime. A ordem, a vez
		// do jogador e o texto "Vez do mestre" são calculados no render. Sem
		// esta assinatura a mesa não receberia a fila dos outros clientes nem
		// buscaria de novo depois que a conexão cai e volta.
		if (!sceneId) return;
		return subscribeCombat(sceneId);
	}, [sceneId]);

	if (!panelOpen) return null;

	if (isMobile) {
		return (
			<BottomSheet
				open
				modal={false}
				onOpenChange={(next) => {
					if (!next) useCombatStore.getState().setPanelOpen(false);
				}}
				title="Combate"
				aria-label="Combate"
			>
				<CombatPanelContent />
			</BottomSheet>
		);
	}

	return (
		<aside
			aria-label="Combate"
			className="pointer-events-auto absolute top-32 right-3 z-30 flex max-h-[min(32rem,calc(100dvh-14rem))] w-80 flex-col gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur-md select-none"
		>
			<h2 className="font-display text-base font-semibold text-foreground">
				Combate
			</h2>
			<CombatPanelContent />
		</aside>
	);
}
