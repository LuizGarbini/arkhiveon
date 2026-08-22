import {
	Eye,
	EyeOff,
	Heart,
	Lock,
	Minus,
	Plus,
	RotateCw,
	ShieldAlert,
	Trash2,
	Unlock,
	X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

interface VTTTokenMenuProps {
	token: VTTToken | null;
	onUpdateToken: (tokenId: string, updates: Partial<VTTToken>) => Promise<void>;
	onDeleteToken: (tokenId: string) => Promise<void>;
}

const COMMON_CONDITIONS = [
	{
		id: "envenenado",
		label: "Envenenado",
		icon: "🧪",
		color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
	},
	{
		id: "caido",
		label: "Caído",
		icon: "🧎",
		color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
	},
	{
		id: "cego",
		label: "Cego",
		icon: "👁️‍🗨️",
		color: "text-zinc-400 border-zinc-500/40 bg-zinc-500/10",
	},
	{
		id: "atordoado",
		label: "Atordoado",
		icon: "⚡",
		color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
	},
	{
		id: "invisivel",
		label: "Invisível",
		icon: "👻",
		color: "text-sky-400 border-sky-500/40 bg-sky-500/10",
	},
	{
		id: "chamas",
		label: "Em Chamas",
		icon: "🔥",
		color: "text-rose-400 border-rose-500/40 bg-rose-500/10",
	},
	{
		id: "concentracao",
		label: "Concentração",
		icon: "🔮",
		color: "text-purple-400 border-purple-500/40 bg-purple-500/10",
	},
];

export function VTTTokenMenu({
	token,
	onUpdateToken,
	onDeleteToken,
}: VTTTokenMenuProps) {
	const { activeTokenIdForMenu, setActiveTokenIdForMenu, isGM, viewport } =
		useVTTStore();

	const [customHpMod, setCustomHpMod] = useState("");

	if (!token || activeTokenIdForMenu !== token.id) return null;

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

	// Clamp to keep inside screen boundaries
	const leftPos = Math.min(Math.max(screenX + 50, 20), window.innerWidth - 340);
	const topPos = Math.min(
		Math.max(screenY - 100, 70),
		window.innerHeight - 450,
	);

	return (
		<div
			style={{ left: `${leftPos}px`, top: `${topPos}px` }}
			className="fixed z-50 w-80 p-4 rounded-3xl border border-white/15 bg-black/90 backdrop-blur-2xl shadow-2xl space-y-3.5 select-none pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
		>
			{/* Token Header */}
			<div className="flex items-center justify-between pb-2.5 border-b border-white/10">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="h-8 w-8 rounded-full border border-primary/40 bg-primary/20 overflow-hidden shrink-0 flex items-center justify-center">
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
					<div className="min-w-0">
						<h4 className="font-display font-bold text-xs text-white truncate">
							{token.name}
						</h4>
						<p className="text-[10px] text-white/50">
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

				<button
					type="button"
					onClick={() => setActiveTokenIdForMenu(null)}
					className="h-7 w-7 flex items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			</div>

			{/* HP Adjustment Section */}
			<div className="space-y-2">
				<div className="flex items-center justify-between text-[11px] font-bold">
					<span className="flex items-center gap-1.5 text-rose-400">
						<Heart className="h-3.5 w-3.5 fill-rose-500/20" />
						Pontos de Vida
					</span>
					<span className="font-mono text-white">
						{token.hpCurrent ?? 0} / {token.hpMax ?? 0}
					</span>
				</div>

				{/* Quick Health Buttons */}
				<div className="grid grid-cols-4 gap-1.5">
					<button
						type="button"
						onClick={() => handleModifyHp(-5)}
						className="py-1 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 font-mono font-bold text-xs hover:bg-rose-500/20 cursor-pointer active:scale-95 transition-all"
					>
						-5
					</button>
					<button
						type="button"
						onClick={() => handleModifyHp(-1)}
						className="py-1 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 font-mono font-bold text-xs hover:bg-rose-500/20 cursor-pointer active:scale-95 transition-all"
					>
						-1
					</button>
					<button
						type="button"
						onClick={() => handleModifyHp(1)}
						className="py-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono font-bold text-xs hover:bg-emerald-500/20 cursor-pointer active:scale-95 transition-all"
					>
						+1
					</button>
					<button
						type="button"
						onClick={() => handleModifyHp(5)}
						className="py-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono font-bold text-xs hover:bg-emerald-500/20 cursor-pointer active:scale-95 transition-all"
					>
						+5
					</button>
				</div>

				{/* Custom HP Input */}
				<div className="flex items-center gap-1.5 pt-1">
					<Input
						type="number"
						placeholder="Valor..."
						value={customHpMod}
						onChange={(e) => setCustomHpMod(e.target.value)}
						className="h-8 text-xs bg-white/5 border-white/10 rounded-xl font-mono"
					/>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => handleCustomHp(true)}
						className="h-8 px-2.5 text-[10px] font-bold border-rose-500/40 text-rose-300 hover:bg-rose-500/20"
					>
						Dano
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => handleCustomHp(false)}
						className="h-8 px-2.5 text-[10px] font-bold border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20"
					>
						Cura
					</Button>
				</div>
			</div>

			{/* Status Conditions */}
			<div className="space-y-1.5">
				<span className="text-[10px] font-extrabold uppercase tracking-wider text-white/50">
					Condições & Status
				</span>
				<div className="flex flex-wrap gap-1">
					{COMMON_CONDITIONS.map((cond) => {
						const isApplied = (token.conditions || []).includes(cond.id);
						return (
							<button
								type="button"
								key={cond.id}
								onClick={() => handleToggleCondition(cond.id)}
								className={cn(
									"flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
									isApplied
										? cond.color
										: "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white",
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
			<div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
				{/* Size */}
				<div className="space-y-1">
					<span className="text-[9px] font-bold text-white/50 uppercase">
						Tamanho
					</span>
					<div className="flex items-center gap-1">
						{[1, 2, 3, 4].map((sz) => (
							<button
								type="button"
								key={sz}
								onClick={() => handleSetSize(sz)}
								className={cn(
									"flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
									token.sizeCells === sz
										? "bg-primary text-primary-foreground border-primary"
										: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
								)}
							>
								{sz}x
							</button>
						))}
					</div>
				</div>

				{/* Elevation / Flight */}
				<div className="space-y-1">
					<span className="text-[9px] font-bold text-white/50 uppercase">
						Elevação: {token.elevation || 0}m
					</span>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => handleElevation(-1.5)}
							className="flex-1 py-1 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 cursor-pointer"
						>
							<Minus className="h-3 w-3" />
						</button>
						<button
							type="button"
							onClick={() => handleElevation(1.5)}
							className="flex-1 py-1 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 cursor-pointer"
						>
							<Plus className="h-3 w-3" />
						</button>
					</div>
				</div>
			</div>

			{/* Quick Actions (Rotate, Hide, Lock, Delete) */}
			<div className="flex items-center justify-between pt-2 border-t border-white/10">
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={handleRotate}
						title="Girar Token (45º)"
						className="h-8 w-8 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
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
									"h-8 w-8 flex items-center justify-center rounded-xl border transition-all cursor-pointer",
									token.isHidden
										? "border-amber-500/40 bg-amber-500/20 text-amber-300"
										: "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
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
									"h-8 w-8 flex items-center justify-center rounded-xl border transition-all cursor-pointer",
									token.layer === "gm"
										? "border-purple-500/50 bg-purple-500/30 text-purple-300 shadow-md shadow-purple-500/20"
										: "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
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
							"h-8 w-8 flex items-center justify-center rounded-xl border transition-all cursor-pointer",
							token.isLocked
								? "border-primary/40 bg-primary/20 text-primary"
								: "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
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
					className="h-8 px-2 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1 rounded-xl"
				>
					<Trash2 className="h-3 w-3" />
					<span>Excluir</span>
				</Button>
			</div>
		</div>
	);
}
