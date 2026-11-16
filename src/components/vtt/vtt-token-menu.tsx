import {
	Eye,
	EyeOff,
	Lock,
	Minus,
	Plus,
	RotateCcw,
	RotateCw,
	ShieldAlert,
	Trash2,
	Unlock,
	X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useIsMobile } from "@/components/character-sheet/view/number-detail";
import { AddBonusDieForm } from "@/components/character-sheet/view/table-resources-strip";
import { ImageViewer } from "@/components/images/image-viewer";
import { Button } from "@/components/ui/button";
import {
	SelectContent,
	SelectItem,
	SelectRoot,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/components/ui/toast";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	ArcaneSparkGlyph,
	CodexScrollGlyph,
	D20Glyph,
	ExpandFrameGlyph,
} from "@/components/vtt/sheet/sheet-icons";
import { VttHpAdjust } from "@/components/vtt/vtt-hp-adjust";
import {
	tokenRemovalKind,
	VTTRemoveTokenDialog,
} from "@/components/vtt/vtt-remove-token-dialog";
import { useAuth } from "@/lib/auth";
import { useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import {
	addBonusDie,
	mergeTableResources,
	normalizeTableResources,
	setInspiration,
	spendBonusDie,
	spendInspiration,
	type TableResources,
} from "@/lib/table-resources";
import { cn } from "@/lib/utils";
import {
	resolveTokenHp,
	selectSheetHealth,
	selectSheetHealthMax,
} from "@/lib/vtt/character-hp";
import {
	scaledStatusDiscMetrics,
	toggleCondition,
	VTT_CONDITIONS,
} from "@/lib/vtt/conditions";
import { tokenImageForViewer } from "@/lib/vtt/permissions";
import { StatusIcon } from "@/lib/vtt/status-icons";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

interface VTTTokenMenuProps {
	token: VTTToken | null;
	/** Resolve `false` quando o servidor recusou a gravação. */
	onUpdateToken: (
		tokenId: string,
		updates: Partial<VTTToken>,
	) => Promise<unknown>;
	/** `false` quando o servidor recusou a remoção. */
	onDeleteToken: (tokenId: string) => Promise<boolean | undefined>;
}

export function VTTTokenMenu({
	token,
	onUpdateToken: saveToken,
	onDeleteToken: deleteToken,
}: VTTTokenMenuProps) {
	const activeTokenIdForMenu = useVTTStore((s) => s.activeTokenIdForMenu);
	const setActiveTokenIdForMenu = useVTTStore((s) => s.setActiveTokenIdForMenu);
	const setShowCharacterSheetId = useVTTStore((s) => s.setShowCharacterSheetId);
	const isGM = useVTTStore((s) => s.isGM);
	const canManage = useVTTStore((s) => s.isGM || s.isCoGM);
	const viewport = useVTTStore((s) => s.viewport);

	const isMobile = useIsMobile();
	const sheetOpen = useVTTStore((s) => s.showCharacterSheetId);
	const characterId = token?.characterId ?? null;
	const { user } = useAuth();
	const character = useRPGStore((s) =>
		characterId
			? (s.characters.find((c) => c.id === characterId) ?? null)
			: null,
	);
	const sheetHealth = useRPGStore((s) => selectSheetHealth(s, characterId));
	const sheetHealthMax = useRPGStore((s) =>
		selectSheetHealthMax(s, characterId),
	);
	const [viewerOpen, setViewerOpen] = useState(false);
	const [removeOpen, setRemoveOpen] = useState(false);
	const [removeError, setRemoveError] = useState<string | null>(null);
	// Quem abriu o visualizador (retrato ou item do menu) recebe o foco de volta.
	const viewerOpenerRef = useRef<HTMLElement | null>(null);
	const [saving, setSaving] = useState(false);
	const pendingRef = useRef(false);
	const runMutation = async (operation: () => Promise<void>) => {
		if (pendingRef.current) return;
		pendingRef.current = true;
		setSaving(true);
		try {
			await operation();
		} finally {
			pendingRef.current = false;
			setSaving(false);
		}
	};
	const onUpdateToken = (id: string, updates: Partial<VTTToken>) =>
		runMutation(async () => {
			await saveToken(id, updates);
		});
	const confirmRemove = () => {
		if (!token) return;
		setRemoveError(null);
		void runMutation(async () => {
			const failed =
				"Não foi possível remover o token. Ele foi mantido na mesa.";
			try {
				const ok = await deleteToken(token.id);
				if (ok === false) {
					setRemoveError(failed);
					return;
				}
				setRemoveOpen(false);
			} catch (cause) {
				setRemoveError(cause instanceof Error ? cause.message : failed);
			}
		});
	};

	if (!token || activeTokenIdForMenu !== token.id) return null;
	if (isMobile && sheetOpen) return null;

	const viewerSrc = tokenImageForViewer(token, isGM);
	const viewerLabel = token.name.trim() || "Sem nome";
	const openViewer = (opener: HTMLElement) => {
		viewerOpenerRef.current = opener;
		setViewerOpen(true);
	};

	const hp = resolveTokenHp({
		tokenHpCurrent: token.hpCurrent,
		tokenHpMax: token.hpMax,
		sheetHealth,
		sheetHealthMax,
	});

	const isCharacterCreator = Boolean(
		character && user?.id && character.createdBy === user.id,
	);
	const isTokenController = Boolean(
		user?.id && token.controlledBy?.includes(user.id),
	);
	const canEdit = character
		? canManage || isCharacterCreator || isTokenController
		: canManage;
	const showMax = canEdit;

	const tokenTempHp =
		character?.tempHealth !== undefined
			? character.tempHealth
			: (token.tempHp ?? 0);

	const handleUpdateHp = (next: number) => {
		void onUpdateToken(token.id, { hpCurrent: next });
	};

	const handleUpdateMax = async (nextMax: number) => {
		if (character) {
			await useRPGStore.getState().updateCharacter(character.id, {
				healthMax: nextMax,
			});
		}
		await onUpdateToken(token.id, {
			hpMax: nextMax,
		});
	};

	const handleUpdateHpValues = async ({
		current,
		max,
	}: {
		current?: number;
		max?: number;
	}) => {
		if (character) {
			const charPatch: Partial<Character> = {};
			if (current !== undefined) charPatch.health = current;
			if (max !== undefined) charPatch.healthMax = max;
			if (Object.keys(charPatch).length > 0) {
				await useRPGStore.getState().updateCharacter(character.id, charPatch);
			}
		}
		const tokenPatch: Partial<VTTToken> = {};
		if (current !== undefined) tokenPatch.hpCurrent = current;
		if (max !== undefined) tokenPatch.hpMax = max;
		if (Object.keys(tokenPatch).length > 0) {
			await onUpdateToken(token.id, tokenPatch);
		}
	};

	const handleUpdateTempHp = async (nextTemp: number) => {
		const sanitized = Math.max(0, nextTemp);
		if (character) {
			await useRPGStore.getState().updateCharacter(character.id, {
				tempHealth: sanitized,
			});
		}
		await onUpdateToken(token.id, {
			tempHp: sanitized,
		});
	};

	// Status: otimista. Aplica na mesa na hora e grava; se o servidor recusar,
	// volta ao que estava (se ninguém mexeu de novo) e avisa com toast.
	const handleToggleCondition = (conditionId: string) => {
		if (pendingRef.current) return;
		const tokenId = token.id;
		const previous = token.conditions ?? [];
		const next = toggleCondition(previous, conditionId);
		useVTTStore.getState().updateToken(tokenId, { conditions: next });
		void runMutation(async () => {
			const ok = await saveToken(tokenId, { conditions: next });
			if (ok !== false) return;
			const now = useVTTStore
				.getState()
				.tokens.find((t) => t.id === tokenId)?.conditions;
			if (now && now.join("|") === next.join("|")) {
				useVTTStore.getState().updateToken(tokenId, { conditions: previous });
			}
			showToast("error", {
				title: "Não foi possível salvar o status",
				description: "O token voltou ao que estava antes.",
			});
		});
	};
	const missingConditions = VTT_CONDITIONS.filter(
		(c) => !(token.conditions ?? []).includes(c.id),
	);

	const handleSetSize = (size: number) => {
		void onUpdateToken(token.id, { sizeCells: size });
	};

	const handleRotate = (delta = 45) => {
		const nextRot = ((((token.rotation || 0) + delta) % 360) + 360) % 360;
		void onUpdateToken(token.id, { rotation: nextRot });
	};

	const handleElevation = (delta: number) => {
		const nextElev = Math.max(0, (token.elevation || 0) + delta);
		void onUpdateToken(token.id, { elevation: nextElev });
	};

	// Position the floating menu relative to token's screen coordinates
	const gridSize =
		useVTTStore.getState().scenes.find((sc) => sc.id === token.sceneId)
			?.gridSize ?? 70;
	const tokenRadius = (token.sizeCells * gridSize) / 2;
	const disc = scaledStatusDiscMetrics(tokenRadius);
	const screenX = token.x * viewport.scale + viewport.x;
	const screenY = token.y * viewport.scale + viewport.y;
	const tokenScreenRadius = disc.ringOuterRadius * viewport.scale + 16;
	const menuOffsetX = Math.max(56, Math.round(tokenScreenRadius));

	// Clamp to keep inside screen boundaries. The bottom reserve keeps the
	// zoom dock (bottom-3, 44px buttons) visible below the panel.
	const BOTTOM_RESERVE = 76;
	// Room for the whole panel (header, HP, conditions, size, elevation and the
	// pinned action row) so nothing sits behind the sticky footer on common
	// phone and desktop heights; shorter screens scroll the body instead.
	const PANEL_HEIGHT_BUDGET = 700;
	const leftPos = Math.max(
		12,
		Math.min(screenX + menuOffsetX, window.innerWidth - 332),
	);
	const topPos = Math.min(
		Math.max(screenY - 100, 128),
		Math.max(128, window.innerHeight - BOTTOM_RESERVE - PANEL_HEIGHT_BUDGET),
	);

	return (
		<div
			style={{
				left: `${leftPos}px`,
				top: `${topPos}px`,
				maxHeight: Math.max(240, window.innerHeight - topPos - BOTTOM_RESERVE),
			}}
			className="fixed z-50 w-[min(20rem,calc(100vw-1.5rem))] space-y-2.5 overflow-y-auto overscroll-contain scroll-pb-24 p-3.5 rounded-2xl border border-white/[0.09] bg-card/96 bg-[radial-gradient(ellipse_90%_32%_at_50%_0%,var(--primary-muted),transparent_70%)] backdrop-blur-xl shadow-[0_24px_60px_-12px_oklch(0_0_0/0.8),inset_0_1px_0_oklch(1_0_0/0.07)] select-none pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
		>
			{/* Token Header */}
			<div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.07]">
				<div className="flex items-center gap-2.5 min-w-0">
					{viewerSrc ? (
						<Tooltip>
							<TooltipTrigger
								render={
									<button
										type="button"
										onClick={(event) => openViewer(event.currentTarget)}
										aria-label={`Ver imagem de ${viewerLabel} em tela cheia`}
										aria-haspopup="dialog"
										className="group relative -m-0.5 flex h-[48px] w-[48px] shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									/>
								}
							>
								<span className="relative flex h-[44px] w-[44px] items-center justify-center overflow-hidden rounded-full ring-1 ring-white/[0.14] bg-black/40 shadow-sm">
									<img
										src={viewerSrc}
										alt=""
										className="h-full w-full object-cover"
									/>
									<span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition duration-150 group-hover:bg-black/55 group-hover:opacity-100 group-focus-visible:bg-black/55 group-focus-visible:opacity-100">
										<ExpandFrameGlyph className="size-4 drop-shadow" />
									</span>
								</span>
							</TooltipTrigger>
							<TooltipContent>Ver em tela cheia</TooltipContent>
						</Tooltip>
					) : (
						<div className="h-11 w-11 rounded-full ring-1 ring-white/[0.14] bg-black/40 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
							{token.avatarUrl ? (
								<img
									src={token.avatarUrl}
									alt={token.name}
									className="h-full w-full object-cover"
								/>
							) : (
								<span className="font-semibold text-xs text-primary">
									{token.name[0]}
								</span>
							)}
						</div>
					)}
					<div className="min-w-0">
						<h4 className="font-display font-semibold text-[13px] tracking-tight text-foreground truncate">
							{token.name}
						</h4>
						<p className="text-[11px] text-muted-foreground">
							{token.sizeCells === 1
								? "Médio (1×1)"
								: token.sizeCells === 2
									? "Grande (2×2)"
									: token.sizeCells === 3
										? "Enorme (3×3)"
										: "Imenso (4×4)"}
						</p>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-1">
					<Tooltip>
						<TooltipTrigger
							render={
								<button
									type="button"
									aria-label="Abrir ficha na mesa"
									onClick={() => {
										setShowCharacterSheetId(token.id);
										setActiveTokenIdForMenu(null);
									}}
									className="group flex h-9 [@media(pointer:coarse)]:h-11 items-center gap-1.5 rounded-lg border border-white/[0.09] bg-linear-to-b from-white/[0.06] to-white/[0.02] px-2.5 text-xs font-medium text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.06)] transition-all duration-150 hover:border-primary/40 hover:from-primary/15 hover:to-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.97] cursor-pointer"
								/>
							}
						>
							<CodexScrollGlyph className="t-icon-spring size-3.5 text-primary/90" />
							Ficha
						</TooltipTrigger>
						<TooltipContent>Abrir ficha na mesa</TooltipContent>
					</Tooltip>
					<button
						type="button"
						aria-label="Fechar menu do token"
						onClick={() => setActiveTokenIdForMenu(null)}
						className="size-9 [@media(pointer:coarse)]:size-11 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors cursor-pointer"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>

			{viewerSrc && (
				<button
					type="button"
					onClick={(event) => openViewer(event.currentTarget)}
					aria-haspopup="dialog"
					className="group relative flex h-[48px] w-full items-center justify-between overflow-hidden rounded-xl border border-white/[0.08] bg-black/35 px-3 text-xs font-medium text-foreground/90 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)] transition-all duration-200 hover:border-primary/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.985] cursor-pointer"
				>
					<img
						src={viewerSrc}
						alt=""
						aria-hidden
						className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-45 blur-[0.5px] transition-transform duration-300 group-hover:scale-105"
					/>
					<span
						aria-hidden
						className="pointer-events-none absolute inset-0 bg-linear-to-r from-background/90 via-background/65 to-transparent"
					/>
					<span className="relative z-10 flex items-center gap-2">
						<span className="flex size-6 items-center justify-center rounded-md border border-white/[0.1] bg-background/70 text-primary shadow-2xs backdrop-blur-sm">
							<ExpandFrameGlyph className="t-icon-spring size-3.5" />
						</span>
						Ver imagem em tela cheia
					</span>
				</button>
			)}
			{viewerSrc && (
				<ImageViewer
					open={viewerOpen}
					onOpenChange={setViewerOpen}
					src={viewerSrc}
					alt={viewerLabel}
					title={viewerLabel}
					finalFocus={viewerOpenerRef}
				/>
			)}

			{saving && (
				<output className="text-xs text-muted-foreground">
					Salvando token…
				</output>
			)}
			<fieldset
				disabled={saving}
				aria-busy={saving}
				className="min-w-0 space-y-2.5 disabled:opacity-60"
			>
				<div className="space-y-2.5">
					<VttHpAdjust
						hpCurrent={hp.current}
						hpMax={hp.max}
						showMax={showMax}
						tempHp={tokenTempHp}
						onChange={character || canEdit ? handleUpdateHp : undefined}
						onChangeMax={canEdit ? handleUpdateMax : undefined}
						onChangeHp={canEdit ? handleUpdateHpValues : undefined}
						onChangeTempHp={canEdit ? handleUpdateTempHp : undefined}
					/>

					{character && (
						<TokenCharacterResources character={character} canEdit={canEdit} />
					)}

					{/* Status Conditions */}
					<div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
						<span className="text-[11px] font-medium text-muted-foreground">
							Condições & Status
						</span>
						{missingConditions.length > 0 ? (
							<SelectRoot<string>
								value={null}
								onValueChange={(next) => {
									if (next) handleToggleCondition(next);
								}}
							>
								<SelectTrigger aria-label="Adicionar status">
									<SelectValue>
										{() => (
											<span className="text-muted-foreground">
												Adicionar status…
											</span>
										)}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{missingConditions.map((cond) => (
										<SelectItem
											key={cond.id}
											value={cond.id}
											label={cond.label}
										>
											<span className="flex items-center gap-2">
												<StatusIcon
													name={cond.icon}
													className="text-muted-foreground"
												/>
												{cond.label}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</SelectRoot>
						) : null}
						<div className="grid grid-cols-2 gap-1.5">
							{VTT_CONDITIONS.map((cond) => {
								const isApplied = (token.conditions || []).includes(cond.id);
								return (
									<button
										type="button"
										key={cond.id}
										aria-label={cond.label}
										aria-pressed={isApplied}
										onClick={() => handleToggleCondition(cond.id)}
										className={cn(
											"group flex min-h-9 [@media(pointer:coarse)]:min-h-11 items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer",
											// Ícone monocromático: só a borda/fundo levam a cor do status.
											isApplied
												? cn(
														cond.color,
														"text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]",
													)
												: "border-white/[0.07] bg-black/25 text-muted-foreground hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-foreground",
										)}
									>
										<span className="flex min-w-0 items-center gap-1.5">
											<StatusIcon name={cond.icon} className="shrink-0" />
											<span className="truncate">{cond.label}</span>
										</span>
										{isApplied ? (
											<span
												aria-hidden
												className="size-1.5 shrink-0 rounded-full bg-current shadow-[0_0_6px_currentColor]"
											/>
										) : null}
									</button>
								);
							})}
						</div>
					</div>

					{/* Size & Elevation Controls */}
					<div className="grid grid-cols-[1.35fr_1fr] gap-2 pt-2 border-t border-white/[0.06]">
						{/* Size */}
						<div className="space-y-1.5">
							<span className="text-[11px] font-medium text-muted-foreground">
								Tamanho
							</span>
							<div className="flex divide-x divide-white/[0.07] overflow-hidden rounded-lg border border-white/[0.08] bg-black/30 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]">
								{[1, 2, 3, 4].map((sz) => (
									<button
										type="button"
										key={sz}
										aria-label={`Tamanho ${sz} por ${sz} células`}
										aria-pressed={token.sizeCells === sz}
										onClick={() => handleSetSize(sz)}
										className={cn(
											"flex-1 h-9 [@media(pointer:coarse)]:min-h-11 text-[11px] font-mono transition-all cursor-pointer focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary",
											token.sizeCells === sz
												? "bg-primary/18 text-primary font-semibold shadow-[inset_0_1px_0_var(--primary)]"
												: "bg-linear-to-b from-white/[0.03] to-transparent text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
										)}
									>
										{sz}x
									</button>
								))}
							</div>
						</div>

						{/* Elevation / Flight */}
						<div className="space-y-1.5">
							<span className="text-[11px] font-medium text-muted-foreground tabular-nums">
								Elevação · {token.elevation || 0}m
							</span>
							<div className="flex divide-x divide-white/[0.07] overflow-hidden rounded-lg border border-white/[0.08] bg-black/30 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]">
								<button
									type="button"
									onClick={() => handleElevation(-1.5)}
									aria-label="Diminuir elevação em 1,5 metro"
									className="flex-1 h-9 [@media(pointer:coarse)]:min-h-11 flex items-center justify-center bg-linear-to-b from-white/[0.03] to-transparent text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground cursor-pointer focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
								>
									<Minus className="h-3.5 w-3.5" />
								</button>
								<button
									type="button"
									onClick={() => handleElevation(1.5)}
									aria-label="Aumentar elevação em 1,5 metro"
									className="flex-1 h-9 [@media(pointer:coarse)]:min-h-11 flex items-center justify-center bg-linear-to-b from-white/[0.03] to-transparent text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground cursor-pointer focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
								>
									<Plus className="h-3.5 w-3.5" />
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Quick Actions (Rotate, Hide, Lock) — sticky footer so they stay reachable */}
				<div className="sticky -bottom-3.5 z-10 -mx-3.5 -mb-3.5 flex flex-col gap-2 border-t border-white/[0.07] bg-card/98 backdrop-blur-xl px-3.5 pt-2.5 pb-3">
					<div className="flex divide-x divide-white/[0.07] overflow-hidden rounded-lg border border-white/[0.08] bg-black/30 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]">
						<Tooltip>
							<TooltipTrigger
								render={
									<button
										type="button"
										onClick={() => handleRotate(-45)}
										className="group flex-1 h-9 [@media(pointer:coarse)]:h-11 flex items-center justify-center bg-linear-to-b from-white/[0.03] to-transparent text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground cursor-pointer focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
										aria-label="Girar Token para a esquerda (45º)"
									/>
								}
							>
								<RotateCcw className="t-icon-spring h-3.5 w-3.5" />
							</TooltipTrigger>
							<TooltipContent>Girar para a esquerda (45º) · Q</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger
								render={
									<button
										type="button"
										onClick={() => handleRotate(45)}
										className="group flex-1 h-9 [@media(pointer:coarse)]:h-11 flex items-center justify-center bg-linear-to-b from-white/[0.03] to-transparent text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground cursor-pointer focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
										aria-label="Girar Token (45º)"
									/>
								}
							>
								<RotateCw className="t-icon-spring h-3.5 w-3.5" />
							</TooltipTrigger>
							<TooltipContent>Girar Token (45º) · E</TooltipContent>
						</Tooltip>

						{isGM && (
							<>
								<Tooltip>
									<TooltipTrigger
										render={
											<button
												type="button"
												onClick={() =>
													onUpdateToken(token.id, { isHidden: !token.isHidden })
												}
												className={cn(
													"group flex-1 h-9 [@media(pointer:coarse)]:h-11 flex items-center justify-center transition-colors cursor-pointer focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary",
													token.isHidden
														? "bg-amber-500/18 text-amber-300 shadow-[inset_0_1px_0_oklch(0.8_0.15_85/0.4)]"
														: "bg-linear-to-b from-white/[0.03] to-transparent text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
												)}
												aria-label={
													token.isHidden
														? "Revelar aos Jogadores"
														: "Ocultar dos Jogadores"
												}
											/>
										}
									>
										{token.isHidden ? (
											<EyeOff className="t-icon-spring h-3.5 w-3.5" />
										) : (
											<Eye className="t-icon-spring h-3.5 w-3.5" />
										)}
									</TooltipTrigger>
									<TooltipContent>
										{token.isHidden
											? "Revelar aos Jogadores"
											: "Ocultar dos Jogadores"}
									</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger
										render={
											<button
												type="button"
												onClick={() =>
													onUpdateToken(token.id, {
														layer: token.layer === "gm" ? "token" : "gm",
													})
												}
												className={cn(
													"group flex-1 h-9 [@media(pointer:coarse)]:h-11 flex items-center justify-center transition-colors cursor-pointer focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary",
													token.layer === "gm"
														? "bg-primary/18 text-primary shadow-[inset_0_1px_0_var(--primary)]"
														: "bg-linear-to-b from-white/[0.03] to-transparent text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
												)}
												aria-label={
													token.layer === "gm"
														? "Mover para Camada de Jogadores (Tokens)"
														: "Mover para Camada do Mestre (GM Layer)"
												}
											/>
										}
									>
										<ShieldAlert className="t-icon-spring h-3.5 w-3.5" />
									</TooltipTrigger>
									<TooltipContent>
										{token.layer === "gm"
											? "Mover para Camada de Jogadores (Tokens)"
											: "Mover para Camada do Mestre (GM Layer)"}
									</TooltipContent>
								</Tooltip>
							</>
						)}

						<Tooltip>
							<TooltipTrigger
								render={
									<button
										type="button"
										onClick={() =>
											onUpdateToken(token.id, { isLocked: !token.isLocked })
										}
										className={cn(
											"group flex-1 h-9 [@media(pointer:coarse)]:h-11 flex items-center justify-center transition-colors cursor-pointer focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary",
											token.isLocked
												? "bg-primary/18 text-primary shadow-[inset_0_1px_0_var(--primary)]"
												: "bg-linear-to-b from-white/[0.03] to-transparent text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
										)}
										aria-label={
											token.isLocked
												? "Destravar Movimentação"
												: "Travar no Lugar"
										}
									/>
								}
							>
								{token.isLocked ? (
									<Lock className="t-icon-spring h-3.5 w-3.5" />
								) : (
									<Unlock className="t-icon-spring h-3.5 w-3.5" />
								)}
							</TooltipTrigger>
							<TooltipContent>
								{token.isLocked ? "Destravar Movimentação" : "Travar no Lugar"}
							</TooltipContent>
						</Tooltip>
					</div>

					<Button
						type="button"
						variant="outline"
						onClick={() => {
							setRemoveError(null);
							setRemoveOpen(true);
						}}
						aria-label={`Remover ${token.name} da mesa`}
						className="h-9 [@media(pointer:coarse)]:h-11 w-full gap-1.5 rounded-lg border-white/[0.07] bg-black/20 text-xs font-medium text-muted-foreground hover:border-destructive/35 hover:bg-destructive/12 hover:text-destructive"
					>
						<Trash2 className="size-3.5" />
						Remover da mesa
					</Button>
				</div>
			</fieldset>
			<VTTRemoveTokenDialog
				request={
					removeOpen
						? {
								name: token.name,
								tokenIds: [token.id],
								kind: tokenRemovalKind(token),
							}
						: null
				}
				pending={saving}
				error={removeError}
				onOpenChange={(open) => {
					if (!open) setRemoveOpen(false);
				}}
				onConfirm={confirmRemove}
			/>
		</div>
	);
}

function TokenCharacterResources({
	character,
	canEdit,
}: {
	character: Character;
	canEdit: boolean;
}) {
	const res = normalizeTableResources(character.tableResources);
	const [addOpen, setAddOpen] = useState(false);
	const [lastRoll, setLastRoll] = useState<string | null>(null);

	const emit = (next: TableResources) => {
		void useRPGStore.getState().updateCharacter(character.id, {
			tableResources: mergeTableResources(character.tableResources, next),
		});
	};

	const handleSpendDie = (dieId: string) => {
		if (!canEdit) return;
		const result = spendBonusDie(res, dieId);
		if (!result) return;
		emit(result.next);
		const label = `d${result.die.sides}${result.die.origin ? ` · ${result.die.origin}` : ""}`;
		setLastRoll(`${label} → ${result.value}`);
		showToast("info", {
			title: `Dado bônus: ${result.value}`,
			description: `${label} · restam ${result.die.quantity - 1}`,
		});
	};

	const handleSpendInspiration = () => {
		if (!canEdit || res.inspiration <= 0) return;
		emit(spendInspiration(res));
		showToast("info", {
			title: "Inspiração usada",
			description: `Vantagem no teste · restam ${res.inspiration - 1}`,
		});
	};

	const handleAddInspiration = () => {
		if (!canEdit) return;
		emit(setInspiration(res, res.inspiration + 1));
	};

	return (
		<div
			data-testid="token-character-resources"
			className="space-y-2 pt-2 border-t border-white/[0.06]"
		>
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
					<D20Glyph className="size-3.5 text-primary/85" />
					Recursos & Dados Bônus
				</span>
				{canEdit && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setAddOpen(!addOpen)}
						className="h-7 [@media(pointer:coarse)]:min-h-11 px-2 text-[11px] font-medium text-primary hover:bg-primary/10 gap-1 cursor-pointer"
					>
						<Plus className="h-3.5 w-3.5" />
						Dado
					</Button>
				)}
			</div>

			{/* Inspiração */}
			<div className="group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border border-white/[0.07] bg-linear-to-b from-white/[0.025] to-black/25 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]">
				<div className="flex items-center gap-2 min-w-0">
					<ArcaneSparkGlyph
						active={res.inspiration > 0}
						className={cn(
							"t-icon-spring size-4 shrink-0",
							res.inspiration > 0 ? "text-primary" : "text-muted-foreground",
						)}
					/>
					<div className="flex flex-col min-w-0">
						<span className="text-xs font-medium text-foreground">
							Inspiração
						</span>
						<span className="text-[10.5px] text-muted-foreground truncate">
							{res.inspiration > 0 ? "Disponível" : "Sem inspiração"}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					{canEdit && res.inspiration > 0 && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleSpendInspiration}
							className="h-8 [@media(pointer:coarse)]:min-h-11 px-2.5 text-xs font-medium border-primary/35 bg-primary/12 text-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.08)] hover:bg-primary/18 cursor-pointer"
						>
							Usar (1)
						</Button>
					)}
					{canEdit && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={handleAddInspiration}
							className="size-8 [@media(pointer:coarse)]:size-11 text-muted-foreground hover:text-foreground cursor-pointer"
							aria-label="Adicionar inspiração"
						>
							<Plus className="h-3.5 w-3.5" />
						</Button>
					)}
					<span
						key={res.inspiration}
						className="min-w-6 text-center font-mono font-semibold text-sm text-foreground tabular-nums animate-[t-digit-pop-in_300ms_cubic-bezier(0.34,1.45,0.64,1)_both] motion-reduce:animate-none"
					>
						{res.inspiration}
					</span>
				</div>
			</div>

			{/* Formulário para adicionar dado bônus */}
			{addOpen && canEdit && (
				<div className="p-2.5 rounded-xl border border-primary/25 bg-primary/5 space-y-2">
					<AddBonusDieForm
						onCancel={() => setAddOpen(false)}
						onSubmit={(input) => {
							emit(addBonusDie(res, input));
							setAddOpen(false);
						}}
					/>
				</div>
			)}

			{/* Lista de dados bônus */}
			{res.bonusDice.length > 0 ? (
				<div className="flex flex-wrap gap-1.5">
					{res.bonusDice.map((die) => (
						<button
							key={die.id}
							type="button"
							disabled={!canEdit}
							onClick={() => handleSpendDie(die.id)}
							aria-label={`Rolar d${die.sides}${die.origin ? ` (${die.origin})` : ""} e gastar 1 — restam ${die.quantity}`}
							className="t-hover-lift group flex min-h-8 [@media(pointer:coarse)]:min-h-11 items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-linear-to-b from-white/[0.04] to-black/25 text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.04)] hover:border-primary/40 hover:from-primary/12 hover:to-primary/5 cursor-pointer"
						>
							<D20Glyph className="t-icon-spring size-3 text-primary/85" />
							<span className="rounded border border-primary/25 bg-primary/10 px-1.5 py-px font-mono text-[10.5px] font-semibold text-primary">
								d{die.sides}
							</span>
							<span className="font-mono font-semibold text-xs tabular-nums">
								×{die.quantity}
							</span>
							{die.origin && (
								<span className="max-w-[80px] truncate text-[11px] text-muted-foreground">
									{die.origin}
								</span>
							)}
						</button>
					))}
				</div>
			) : (
				<p className="text-[11px] text-muted-foreground">
					Nenhum dado bônus no momento.
				</p>
			)}

			{lastRoll && (
				<p className="text-xs font-mono font-medium tabular-nums text-primary flex items-center gap-1.5">
					<D20Glyph className="size-3.5" />
					{lastRoll}
				</p>
			)}
		</div>
	);
}
