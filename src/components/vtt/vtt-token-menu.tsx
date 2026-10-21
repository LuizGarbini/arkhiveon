import {
	Eye,
	EyeOff,
	Heart,
	Lock,
	Maximize2,
	Minus,
	Plus,
	RotateCw,
	ScrollText,
	ShieldAlert,
	Trash2,
	Unlock,
	X,
} from "lucide-react";
import { useRef, useState } from "react";
import { ImageViewer } from "@/components/images/image-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { VTT_CONDITIONS } from "@/lib/vtt/conditions";
import { tokenImageForViewer } from "@/lib/vtt/permissions";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

interface VTTTokenMenuProps {
	token: VTTToken | null;
	onUpdateToken: (tokenId: string, updates: Partial<VTTToken>) => Promise<void>;
	onDeleteToken: (tokenId: string) => Promise<void>;
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
	const viewport = useVTTStore((s) => s.viewport);

	const [customHpMod, setCustomHpMod] = useState("");
	const [viewerOpen, setViewerOpen] = useState(false);
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
		runMutation(() => saveToken(id, updates));
	const onDeleteToken = (id: string) => runMutation(() => deleteToken(id));

	if (!token || activeTokenIdForMenu !== token.id) return null;

	const viewerSrc = tokenImageForViewer(token, isGM);
	const viewerLabel = token.name.trim() || "Sem nome";
	const openViewer = (opener: HTMLElement) => {
		viewerOpenerRef.current = opener;
		setViewerOpen(true);
	};

	const handleModifyHp = (amount: number) => {
		const current = token.hpCurrent ?? 0;
		const max = token.hpMax ?? current;
		const nextHp = Math.max(0, Math.min(current + amount, max));
		void onUpdateToken(token.id, { hpCurrent: nextHp });
	};

	const handleCustomHp = (isDamage: boolean) => {
		const val = Number.parseInt(customHpMod, 10);
		if (Number.isNaN(val) || val <= 0) return;
		handleModifyHp(isDamage ? -val : val);
		setCustomHpMod("");
	};

	const handleToggleCondition = (conditionId: string) => {
		const current = token.conditions || [];
		const next = current.includes(conditionId)
			? current.filter((c) => c !== conditionId)
			: [...current, conditionId];
		void onUpdateToken(token.id, { conditions: next });
	};

	const handleSetSize = (size: number) => {
		void onUpdateToken(token.id, { sizeCells: size });
	};

	const handleRotate = () => {
		const nextRot = ((token.rotation || 0) + 45) % 360;
		void onUpdateToken(token.id, { rotation: nextRot });
	};

	const handleElevation = (delta: number) => {
		const nextElev = Math.max(0, (token.elevation || 0) + delta);
		void onUpdateToken(token.id, { elevation: nextElev });
	};

	// Position the floating menu relative to token's screen coordinates
	const screenX = token.x * viewport.scale + viewport.x;
	const screenY = token.y * viewport.scale + viewport.y;

	// Clamp to keep inside screen boundaries. The bottom reserve keeps the
	// zoom dock (bottom-3, 44px buttons) visible below the panel.
	const BOTTOM_RESERVE = 76;
	// Room for the whole panel (header, HP, conditions, size, elevation and the
	// pinned action row) so nothing sits behind the sticky footer on common
	// phone and desktop heights; shorter screens scroll the body instead.
	const PANEL_HEIGHT_BUDGET = 640;
	const leftPos = Math.max(12, Math.min(screenX + 50, window.innerWidth - 332));
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
			className="fixed z-50 w-[min(20rem,calc(100vw-1.5rem))] space-y-3 overflow-y-auto overscroll-contain scroll-pb-24 p-4 rounded-3xl border border-border/70 bg-card/95 backdrop-blur-md shadow-2xl select-none pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
		>
			{/* Token Header */}
			<div className="flex items-center justify-between pb-2.5 border-b border-border/70">
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
								<span className="relative flex h-[44px] w-[44px] items-center justify-center overflow-hidden rounded-full border border-primary/40 bg-primary/20">
									<img
										src={viewerSrc}
										alt=""
										className="h-full w-full object-cover"
									/>
									<span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition duration-150 group-hover:bg-black/50 group-hover:opacity-100 group-focus-visible:bg-black/50 group-focus-visible:opacity-100">
										<Maximize2 className="h-4 w-4 drop-shadow" aria-hidden />
									</span>
								</span>
							</TooltipTrigger>
							<TooltipContent>Ver em tela cheia</TooltipContent>
						</Tooltip>
					) : (
						<div className="h-11 w-11 rounded-full border border-primary/40 bg-primary/20 overflow-hidden shrink-0 flex items-center justify-center">
							{token.avatarUrl ? (
								<img
									src={token.avatarUrl}
									alt={token.name}
									className="h-full w-full object-cover"
								/>
							) : (
								<span className="font-bold text-xs text-primary">
									{token.name[0]}
								</span>
							)}
						</div>
					)}
					<div className="min-w-0">
						<h4 className="font-display font-bold text-xs text-foreground truncate">
							{token.name}
						</h4>
						<p className="text-[10px] text-muted-foreground">
							{token.sizeCells === 1
								? "Médio (1x1)"
								: token.sizeCells === 2
									? "Grande (2x2)"
									: token.sizeCells === 3
										? "Enorme (3x3)"
										: "Imenso (4x4)"}
						</p>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-1">
					<button
						type="button"
						aria-label="Abrir ficha na mesa"
						title="Abrir ficha na mesa"
						onClick={() => {
							setShowCharacterSheetId(token.id);
							setActiveTokenIdForMenu(null);
						}}
						className="flex h-11 items-center gap-1.5 rounded-xl border border-border/70 bg-card-elevated px-3 text-xs font-semibold text-foreground transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] cursor-pointer"
					>
						<ScrollText className="h-3.5 w-3.5 text-primary" />
						Ficha
					</button>
					<button
						type="button"
						aria-label="Fechar menu do token"
						onClick={() => setActiveTokenIdForMenu(null)}
						className="h-11 w-11 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>

			{viewerSrc && (
				<Button
					type="button"
					variant="outline"
					onClick={(event) => openViewer(event.currentTarget)}
					aria-haspopup="dialog"
					className="h-[48px] w-full justify-start gap-2 rounded-xl text-xs font-semibold"
				>
					<Maximize2 className="h-3.5 w-3.5 text-primary" aria-hidden />
					Ver imagem em tela cheia
				</Button>
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
				className="min-w-0 space-y-3 disabled:opacity-60"
			>
				<div className="space-y-3">
					{/* HP Adjustment Section */}
					<div className="space-y-2">
						<div className="flex items-center justify-between text-[11px] font-bold">
							<span className="flex items-center gap-1.5 text-rose-400">
								<Heart className="h-3.5 w-3.5 fill-rose-500/20" />
								Pontos de Vida
							</span>
							<span className="font-mono text-foreground">
								{token.hpCurrent ?? 0} / {token.hpMax ?? 0}
							</span>
						</div>

						{/* Quick Health Buttons */}
						<div className="grid grid-cols-4 gap-1.5">
							<button
								type="button"
								onClick={() => handleModifyHp(-5)}
								className="min-h-11 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 font-mono font-bold text-xs hover:bg-rose-500/20 cursor-pointer active:scale-[0.98] transition-all"
							>
								-5
							</button>
							<button
								type="button"
								onClick={() => handleModifyHp(-1)}
								className="min-h-11 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 font-mono font-bold text-xs hover:bg-rose-500/20 cursor-pointer active:scale-[0.98] transition-all"
							>
								-1
							</button>
							<button
								type="button"
								onClick={() => handleModifyHp(1)}
								className="min-h-11 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono font-bold text-xs hover:bg-emerald-500/20 cursor-pointer active:scale-[0.98] transition-all"
							>
								+1
							</button>
							<button
								type="button"
								onClick={() => handleModifyHp(5)}
								className="min-h-11 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono font-bold text-xs hover:bg-emerald-500/20 cursor-pointer active:scale-[0.98] transition-all"
							>
								+5
							</button>
						</div>

						{/* Custom HP Input */}
						<div className="flex items-center gap-1.5 pt-1">
							<Input
								type="number"
								aria-label="Quantidade de dano ou cura"
								placeholder="Valor..."
								value={customHpMod}
								onChange={(e) => setCustomHpMod(e.target.value)}
								className="h-11 text-base sm:text-xs bg-card-elevated border-border/70 rounded-xl font-mono"
							/>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => handleCustomHp(true)}
								className="h-11 px-3 text-[10px] font-bold border-rose-500/40 text-rose-300 hover:bg-rose-500/20"
							>
								Dano
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => handleCustomHp(false)}
								className="h-11 px-3 text-[10px] font-bold border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20"
							>
								Cura
							</Button>
						</div>
					</div>

					{/* Status Conditions */}
					<div className="space-y-1.5">
						<span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
							Condições & Status
						</span>
						<div className="flex flex-wrap gap-1">
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
											"flex min-h-11 items-center gap-1 px-2.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
											isApplied
												? cond.color
												: "border-border/70 bg-card-elevated text-muted-foreground hover:bg-accent hover:text-foreground",
										)}
									>
										<span>{cond.icon}</span>
										<span>{cond.label}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Size & Elevation Controls */}
					<div className="grid gap-2 pt-1 border-t border-border/70">
						{/* Size */}
						<div className="space-y-1">
							<span className="text-[9px] font-bold text-muted-foreground uppercase">
								Tamanho
							</span>
							<div className="flex items-center gap-1">
								{[1, 2, 3, 4].map((sz) => (
									<button
										type="button"
										key={sz}
										aria-label={`Tamanho ${sz} por ${sz} células`}
										aria-pressed={token.sizeCells === sz}
										onClick={() => handleSetSize(sz)}
										className={cn(
											"flex-1 min-h-11 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
											token.sizeCells === sz
												? "bg-primary text-primary-foreground border-primary"
												: "border-border/70 bg-card-elevated text-muted-foreground hover:bg-accent",
										)}
									>
										{sz}x
									</button>
								))}
							</div>
						</div>

						{/* Elevation / Flight */}
						<div className="space-y-1">
							<span className="text-[9px] font-bold text-muted-foreground uppercase">
								Elevação: {token.elevation || 0}m
							</span>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => handleElevation(-1.5)}
									aria-label="Diminuir elevação em 1,5 metro"
									className="flex-1 min-h-11 flex items-center justify-center rounded-lg border border-border/70 bg-card-elevated text-muted-foreground hover:bg-accent cursor-pointer"
								>
									<Minus className="h-3 w-3" />
								</button>
								<button
									type="button"
									onClick={() => handleElevation(1.5)}
									aria-label="Aumentar elevação em 1,5 metro"
									className="flex-1 min-h-11 flex items-center justify-center rounded-lg border border-border/70 bg-card-elevated text-muted-foreground hover:bg-accent cursor-pointer"
								>
									<Plus className="h-3 w-3" />
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Quick Actions (Rotate, Hide, Lock, Delete) — sticky footer so they stay reachable */}
				<div className="sticky -bottom-4 z-10 -mx-4 -mb-4 flex items-center justify-between border-t border-border/70 bg-card px-4 pt-2 pb-3">
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={handleRotate}
							title="Girar Token (45º)"
							className="h-11 w-11 flex items-center justify-center rounded-xl border border-border/70 bg-card-elevated text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
						>
							<RotateCw className="h-3.5 w-3.5" />
						</button>

						{isGM && (
							<>
								<button
									type="button"
									onClick={() =>
										onUpdateToken(token.id, { isHidden: !token.isHidden })
									}
									title={
										token.isHidden
											? "Revelar aos Jogadores"
											: "Ocultar dos Jogadores"
									}
									className={cn(
										"h-11 w-11 flex items-center justify-center rounded-xl border transition-all cursor-pointer",
										token.isHidden
											? "border-amber-500/40 bg-amber-500/20 text-amber-300"
											: "border-border/70 bg-card-elevated text-muted-foreground hover:bg-accent",
									)}
								>
									{token.isHidden ? (
										<EyeOff className="h-3.5 w-3.5" />
									) : (
										<Eye className="h-3.5 w-3.5" />
									)}
								</button>

								<button
									type="button"
									onClick={() =>
										onUpdateToken(token.id, {
											layer: token.layer === "gm" ? "token" : "gm",
										})
									}
									title={
										token.layer === "gm"
											? "Mover para Camada de Jogadores (Tokens)"
											: "Mover para Camada do Mestre (GM Layer)"
									}
									className={cn(
										"h-11 w-11 flex items-center justify-center rounded-xl border transition-all cursor-pointer",
										token.layer === "gm"
											? "border-purple-500/50 bg-purple-500/30 text-purple-300 shadow-md shadow-purple-500/20"
											: "border-border/70 bg-card-elevated text-muted-foreground hover:bg-accent",
									)}
								>
									<ShieldAlert className="h-3.5 w-3.5" />
								</button>
							</>
						)}

						<button
							type="button"
							onClick={() =>
								onUpdateToken(token.id, { isLocked: !token.isLocked })
							}
							title={
								token.isLocked ? "Destravar Movimentação" : "Travar no Lugar"
							}
							className={cn(
								"h-11 w-11 flex items-center justify-center rounded-xl border transition-all cursor-pointer",
								token.isLocked
									? "border-primary/40 bg-primary/20 text-primary"
									: "border-border/70 bg-card-elevated text-muted-foreground hover:bg-accent",
							)}
						>
							{token.isLocked ? (
								<Lock className="h-3.5 w-3.5" />
							) : (
								<Unlock className="h-3.5 w-3.5" />
							)}
						</button>
					</div>

					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => onDeleteToken(token.id)}
						className="h-11 px-3 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1 rounded-xl"
					>
						<Trash2 className="h-3 w-3" />
						<span>Excluir</span>
					</Button>
				</div>
			</fieldset>
		</div>
	);
}
