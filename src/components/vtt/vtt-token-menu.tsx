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
import { useLayoutEffect, useRef, useState } from "react";
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

	const isOpen = Boolean(token && activeTokenIdForMenu === token.id);
	const panelRef = useRef<HTMLDivElement>(null);
	const [bounds, setBounds] = useState({
		height: 298,
		width: window.innerWidth,
		heightAvailable: window.innerHeight,
	});
	useLayoutEffect(() => {
		if (!isOpen) return;
		const panel = panelRef.current;
		if (!panel) return;
		const measure = () =>
			setBounds((old) => {
				const next = {
					height: panel.getBoundingClientRect().height || old.height,
					width: window.innerWidth,
					heightAvailable: window.innerHeight,
				};
				return old.height === next.height &&
					old.width === next.width &&
					old.heightAvailable === next.heightAvailable
					? old
					: next;
			});
		measure();
		const observer =
			typeof ResizeObserver !== "undefined"
				? new ResizeObserver(measure)
				: null;
		observer?.observe(panel);
		window.addEventListener("resize", measure);
		return () => {
			observer?.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, [isOpen]);
	if (!token || activeTokenIdForMenu !== token.id) return null;

	const centerX = token.x * viewport.scale + viewport.x;
	const centerY = token.y * viewport.scale + viewport.y;
	const left = Math.max(8, Math.min(centerX - 120, bounds.width - 248));
	const top = Math.max(
		8,
		Math.min(centerY - 120, bounds.heightAvailable - bounds.height - 8),
	);

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
				setShowCharacterSheetId(token.id);
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

	return (
		<div
			ref={panelRef}
			style={{ left, top, transform: "none", maxHeight: "calc(100dvh - 16px)" }}
			className="pointer-events-auto fixed z-50 w-[240px] max-w-[calc(100vw-16px)] overflow-y-auto"
		>
			<div className="relative h-[240px] w-full">
				<div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground shadow-lg backdrop-blur-md">
					<span className="flex items-center gap-1 font-mono text-xs font-bold">
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

			{showConditions && (
				<div className="pointer-events-auto mx-auto mt-3 flex max-w-xs flex-wrap justify-center gap-1.5 rounded-2xl border border-border/70 bg-card/95 p-2 shadow-lg backdrop-blur-md">
					{COMMON_CONDITIONS.map((cond) => {
						const isApplied = (token.conditions || []).includes(cond.id);
						return (
							<button
								type="button"
								key={cond.id}
								aria-pressed={isApplied}
								onClick={() => handleToggleCondition(cond.id)}
								className={cn(
									vttChipClass,
									"min-h-[44px] px-2.5 text-[11px]",
									isApplied
										? "border-primary/40 bg-primary/15 text-foreground"
										: "border-border/70 bg-background/60 text-muted-foreground hover:bg-muted",
								)}
							>
								{cond.label}
							</button>
						);
					})}
				</div>
			)}

			{isGM && (
				<div className="pointer-events-auto mt-2 flex justify-center">
					<button
						type="button"
						onClick={() => {
							void onDeleteToken(token.id);
							setActiveTokenIdForMenu(null);
						}}
						className={cn(
							vttChipClass,
							"border-destructive/30 bg-card/95 text-destructive hover:bg-destructive/10",
						)}
					>
						Excluir token
					</button>
				</div>
			)}
		</div>
	);
}
