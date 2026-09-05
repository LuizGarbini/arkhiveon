import {
	Eye,
	EyeOff,
	Heart,
	Lock,
	Minus,
	Plus,
	RotateCw,
	ScrollText,
	Sparkles,
	Unlock,
	X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import {
	vttChipClass,
	vttIconButtonActiveClass,
	vttIconButtonClass,
	vttIconButtonIdleClass,
} from "./vtt-chrome";

interface VTTTokenMenuProps {
	token: VTTToken | null;
	onUpdateToken: (tokenId: string, updates: Partial<VTTToken>) => Promise<void>;
	onDeleteToken: (tokenId: string) => Promise<void>;
}

const COMMON_CONDITIONS = [
	{ id: "envenenado", label: "Envenenado" },
	{ id: "caido", label: "Caído" },
	{ id: "cego", label: "Cego" },
	{ id: "atordoado", label: "Atordoado" },
	{ id: "invisivel", label: "Invisível" },
	{ id: "chamas", label: "Em chamas" },
	{ id: "concentracao", label: "Concentração" },
];

const RING_RADIUS = 92;

export function VTTTokenMenu({
	token,
	onUpdateToken,
	onDeleteToken,
}: VTTTokenMenuProps) {
	const {
		activeTokenIdForMenu,
		setActiveTokenIdForMenu,
		setShowCharacterSheetId,
		isGM,
		viewport,
	} = useVTTStore();
	const [showConditions, setShowConditions] = useState(false);

	if (!token || activeTokenIdForMenu !== token.id) return null;

	const centerX = token.x * viewport.scale + viewport.x;
	const centerY = token.y * viewport.scale + viewport.y;
	const left = Math.min(Math.max(centerX, 96), window.innerWidth - 96);
	const top = Math.min(Math.max(centerY, 120), window.innerHeight - 120);

	const handleModifyHp = (amount: number) => {
		const current = token.hpCurrent ?? 0;
		const max = token.hpMax ?? Math.max(current, 1);
		void onUpdateToken(token.id, {
			hpCurrent: Math.max(0, Math.min(current + amount, max)),
		});
	};

	const handleToggleCondition = (conditionId: string) => {
		const current = token.conditions || [];
		const next = current.includes(conditionId)
			? current.filter((c) => c !== conditionId)
			: [...current, conditionId];
		void onUpdateToken(token.id, { conditions: next });
	};

	const actions = [
		{
			id: "hp-minus",
			label: "-1 PV",
			angle: -135,
			icon: Minus,
			onClick: () => handleModifyHp(-1),
		},
		{
			id: "hp-plus",
			label: "+1 PV",
			angle: -45,
			icon: Plus,
			onClick: () => handleModifyHp(1),
		},
		{
			id: "conditions",
			label: "Condições",
			angle: 0,
			icon: Sparkles,
			onClick: () => setShowConditions((open) => !open),
			active: showConditions,
		},
		{
			id: "rotate",
			label: "Girar 45°",
			angle: 45,
			icon: RotateCw,
			onClick: () =>
				void onUpdateToken(token.id, {
					rotation: ((token.rotation || 0) + 45) % 360,
				}),
		},
		{
			id: "hide",
			label: token.isHidden ? "Revelar" : "Ocultar",
			angle: 90,
			icon: token.isHidden ? EyeOff : Eye,
			onClick: () =>
				void onUpdateToken(token.id, { isHidden: !token.isHidden }),
			gmOnly: true,
			active: token.isHidden,
		},
		{
			id: "sheet",
			label: "Ficha",
			angle: 135,
			icon: ScrollText,
			onClick: () => {
				setShowCharacterSheetId(token.characterId || token.id);
				setActiveTokenIdForMenu(null);
			},
		},
		{
			id: "lock",
			label: token.isLocked ? "Destravar" : "Travar",
			angle: 180,
			icon: token.isLocked ? Lock : Unlock,
			onClick: () =>
				void onUpdateToken(token.id, { isLocked: !token.isLocked }),
			active: token.isLocked,
		},
		{
			id: "close",
			label: "Fechar",
			angle: -90,
			icon: X,
			onClick: () => {
				setShowConditions(false);
				setActiveTokenIdForMenu(null);
			},
		},
	].filter((action) => !action.gmOnly || isGM);

	const conditionsRow = showConditions ? (
		<div className="pointer-events-auto flex max-w-xs flex-wrap justify-center gap-1.5 rounded-2xl border border-border/70 bg-card/95 p-2 shadow-lg backdrop-blur-md">
			{COMMON_CONDITIONS.map((cond) => {
				const isApplied = (token.conditions || []).includes(cond.id);
				return (
					<button
						type="button"
						key={cond.id}
						onClick={() => handleToggleCondition(cond.id)}
						className={cn(
							vttChipClass,
							"min-h-11 px-2.5",
							isApplied
								? "border-primary/40 bg-primary/15 text-foreground"
								: "border-border/70 bg-background/60 text-muted-foreground [@media(hover:hover)]:hover:bg-muted",
						)}
					>
						{cond.label}
					</button>
				);
			})}
		</div>
	) : null;

	const deleteButton = isGM ? (
		<button
			type="button"
			onClick={() => {
				void onDeleteToken(token.id);
				setActiveTokenIdForMenu(null);
			}}
			className={cn(
				vttChipClass,
				"border-destructive/30 bg-card/95 text-destructive [@media(hover:hover)]:hover:bg-destructive/10",
			)}
		>
			Excluir token
		</button>
	) : null;

	return (
		<>
			<div className="pointer-events-auto fixed inset-x-3 bottom-[5.75rem] z-50 md:hidden">
				<div className="rounded-2xl border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur-md">
					<div className="mb-2 flex items-center justify-between gap-2">
						<div className="min-w-0">
							<p className="truncate font-display text-sm font-bold">
								{token.name}
							</p>
							<p className="flex items-center gap-1 font-mono text-xs font-bold tabular-nums text-muted-foreground">
								<Heart className="h-3 w-3 text-primary" />
								{token.hpCurrent ?? 0}/{token.hpMax ?? 0}
							</p>
						</div>
					</div>
					<div className="grid grid-cols-4 gap-1.5">
						{actions.map((action) => {
							const Icon = action.icon;
							return (
								<button
									type="button"
									key={action.id}
									title={action.label}
									onClick={action.onClick}
									className={cn(
										vttIconButtonClass,
										"w-full border border-border/70 bg-background/60",
										action.active
											? vttIconButtonActiveClass
											: vttIconButtonIdleClass,
									)}
								>
									<Icon className="h-4 w-4" />
									<span className="sr-only">{action.label}</span>
								</button>
							);
						})}
					</div>
					{conditionsRow ? <div className="mt-2">{conditionsRow}</div> : null}
					{deleteButton ? (
						<div className="mt-2 flex justify-center">{deleteButton}</div>
					) : null}
				</div>
			</div>

			<div
				style={{ left: `${left}px`, top: `${top}px` }}
				className="pointer-events-none fixed z-50 hidden -translate-x-1/2 -translate-y-1/2 md:block"
			>
				<div className="relative h-56 w-56">
					<div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground shadow-lg backdrop-blur-md">
						<span className="flex items-center gap-1 font-mono text-xs font-bold tabular-nums">
							<Heart className="h-3 w-3 text-primary" />
							{token.hpCurrent ?? 0}/{token.hpMax ?? 0}
						</span>
						<span className="max-w-[4.5rem] truncate px-1 text-[10px] text-muted-foreground">
							{token.name}
						</span>
					</div>

					{actions.map((action) => {
						const Icon = action.icon;
						const rad = (action.angle * Math.PI) / 180;
						const x = Math.cos(rad) * RING_RADIUS;
						const y = Math.sin(rad) * RING_RADIUS;
						return (
							<button
								type="button"
								key={action.id}
								title={action.label}
								onClick={action.onClick}
								style={{
									left: `calc(50% + ${x}px)`,
									top: `calc(50% + ${y}px)`,
								}}
								className={cn(
									vttIconButtonClass,
									"pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 border border-border/70 bg-card/95 shadow-md backdrop-blur-md",
									action.active
										? vttIconButtonActiveClass
										: vttIconButtonIdleClass,
								)}
							>
								<Icon className="h-4 w-4" />
								<span className="sr-only">{action.label}</span>
							</button>
						);
					})}
				</div>

				{conditionsRow ? (
					<div className="pointer-events-auto mx-auto mt-3">
						{conditionsRow}
					</div>
				) : null}
				{deleteButton ? (
					<div className="pointer-events-auto mt-2 flex justify-center">
						{deleteButton}
					</div>
				) : null}
			</div>
		</>
	);
}
