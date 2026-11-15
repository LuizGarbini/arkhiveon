import {
	Circle,
	Compass,
	Hexagon,
	Moon,
	MousePointer2,
	Square,
	Sun,
	Sunset,
	Trash2,
} from "lucide-react";
import type { ComponentType } from "react";
import {
	Kbd,
	segmentClass,
	VTTOptionsBar,
	VTTOptionsDivider,
	VTTSegmented,
} from "@/components/vtt/vtt-options-bar";
import { cn } from "@/lib/utils";
import { deleteLightZone, setLightZoneLevel } from "@/lib/vtt/light-zone-sync";
import {
	LIGHT_LEVEL_LABEL,
	LIGHT_SHAPE_LABEL,
	type LightToolMode,
} from "@/lib/vtt/light-zones";
import type { VTTScene } from "@/lib/vtt/types";
import { LIGHT_LEVELS, type LightLevel, toLightLevel } from "@/lib/vtt/vision";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const LEVEL_ICON: Record<LightLevel, ComponentType<{ className?: string }>> = {
	bright: Sun,
	dim: Sunset,
	dark: Moon,
};

const LEVEL_HINT: Record<LightLevel, string> = {
	bright: "Enxergam até o alcance da visão",
	dim: "A visão normal cai à metade; visão no escuro vale inteira",
	dark: "Só vale a visão no escuro (sem ela, a casa ao lado)",
};

const SHAPES: {
	id: LightToolMode;
	icon: ComponentType<{ className?: string }>;
	hint: string;
}[] = [
	{
		id: "select",
		icon: MousePointer2,
		hint: "Clique numa área para escolher e mudar a luz dela",
	},
	{ id: "circle", icon: Circle, hint: "Arraste do centro até a borda" },
	{ id: "rect", icon: Square, hint: "Arraste de canto a canto" },
	{
		id: "polygon",
		icon: Hexagon,
		hint: "Clique os pontos; duplo clique ou Enter fecha a área",
	},
];

const actionClass =
	"flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-[background-color,color,transform] duration-150 select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40 [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground";

function LevelButtons({
	value,
	onPick,
	className,
}: {
	value: LightLevel;
	onPick: (level: LightLevel) => void;
	className?: string;
}) {
	return (
		<>
			{LIGHT_LEVELS.map((level) => {
				const Icon = LEVEL_ICON[level];
				return (
					<button
						type="button"
						key={level}
						title={`${LIGHT_LEVEL_LABEL[level]}: ${LEVEL_HINT[level]}`}
						aria-label={LIGHT_LEVEL_LABEL[level]}
						aria-pressed={value === level}
						onClick={() => onPick(level)}
						className={cn(segmentClass(value === level), "min-w-11", className)}
					>
						<Icon aria-hidden className="size-4" />
						<span className="hidden 2xl:inline">
							{LIGHT_LEVEL_LABEL[level]}
						</span>
					</button>
				);
			})}
		</>
	);
}

/** Rótulo curto do grupo (os três grupos de luz têm os mesmos ícones). */
function GroupCaption({ children }: { children: string }) {
	return (
		<span
			aria-hidden
			className="shrink-0 pr-1 pl-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground max-sm:hidden"
		>
			{children}
		</span>
	);
}

/**
 * Painel da ferramenta Luz (só mestre): a luz padrão da cena e as ÁREAS de luz.
 * Escolhe a luz e a forma da próxima área (círculo, retângulo ou polígono, que se
 * desenha no mapa); com uma área selecionada, troca a luz dela ou a apaga. O
 * alcance de visão de cada personagem muda conforme a luz do lugar onde ele está.
 */
export function VTTLightControls({
	scene,
	onUpdateScene,
}: {
	scene: VTTScene | null | undefined;
	onUpdateScene?: (sceneId: string, updates: Partial<VTTScene>) => unknown;
}) {
	const isGM = useVTTStore((s) => s.isGM);
	const activeTool = useVTTStore((s) => s.activeTool);
	const setActiveTool = useVTTStore((s) => s.setActiveTool);
	const drawLevel = useVTTStore((s) => s.lightDrawLevel);
	const drawShape = useVTTStore((s) => s.lightDrawShape);
	const setDrawLevel = useVTTStore((s) => s.setLightDrawLevel);
	const setDrawShape = useVTTStore((s) => s.setLightDrawShape);
	const zones = useVTTStore((s) => s.lightZones);
	const status = useVTTStore((s) => s.lightZonesStatus);
	const selectedId = useVTTStore((s) => s.selectedLightZoneId);
	const draftLength = useVTTStore((s) => s.lightDraft.length);

	if (!isGM || activeTool !== "light" || !scene) return null;

	const sceneLight = toLightLevel(scene.lightLevel);
	const selected = zones.find((z) => z.id === selectedId) ?? null;
	const exploring = Boolean(scene.fogEnabled && scene.fogExploration);

	return (
		<OptionsBody
			scene={scene}
			sceneLight={sceneLight}
			onUpdateScene={onUpdateScene}
			onClose={() => setActiveTool("select")}
			drawLevel={drawLevel}
			drawShape={drawShape}
			setDrawLevel={setDrawLevel}
			setDrawShape={setDrawShape}
			zoneCount={zones.length}
			selected={selected}
			status={status}
			draftLength={draftLength}
			exploring={exploring}
		/>
	);
}

function OptionsBody({
	scene,
	sceneLight,
	onUpdateScene,
	onClose,
	drawLevel,
	drawShape,
	setDrawLevel,
	setDrawShape,
	zoneCount,
	selected,
	status,
	draftLength,
	exploring,
}: {
	scene: VTTScene;
	sceneLight: LightLevel;
	onUpdateScene?: (sceneId: string, updates: Partial<VTTScene>) => unknown;
	onClose: () => void;
	drawLevel: LightLevel;
	drawShape: LightToolMode;
	setDrawLevel: (level: LightLevel) => void;
	setDrawShape: (shape: LightToolMode) => void;
	zoneCount: number;
	selected: { id: string; level: LightLevel } | null;
	status: string;
	draftLength: number;
	exploring: boolean;
}) {
	return (
		<VTTOptionsBar
			label="Luz da cena"
			icon={Sun}
			closeLabel="Fechar ferramenta de luz"
			onClose={onClose}
			wrapOnPhone
			compactLabel
			footer={
				<div className="pointer-events-none flex flex-col items-center gap-1.5">
					{status === "missing" ? (
						<output className="pointer-events-none rounded-full border border-border/70 bg-card/90 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-md">
							As áreas de luz ainda não estão disponíveis no servidor.
						</output>
					) : null}
					{!exploring ? (
						<output className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full border border-border/70 bg-card/90 py-1 pr-1 pl-3 text-[11px] text-muted-foreground backdrop-blur-md">
							A luz só vale com a Exploração ligada.
							<button
								type="button"
								onClick={() =>
									void onUpdateScene?.(scene.id, {
										fogEnabled: true,
										fogExploration: true,
									})
								}
								className="flex min-h-11 items-center gap-1.5 rounded-full bg-primary/15 px-3 text-[11px] font-semibold text-foreground ring-1 ring-inset ring-primary/40 transition-[background-color,transform] duration-150 select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
							>
								<Compass aria-hidden className="size-3.5" />
								Ligar Exploração
							</button>
						</output>
					) : null}
					<p className="pointer-events-none flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-border/70 bg-card/90 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-md">
						<span className="tabular-nums">
							{zoneCount === 1 ? "1 área" : `${zoneCount} áreas`} na cena
						</span>
						{drawShape === "polygon" ? (
							<span className="flex items-center gap-1 [@media(hover:none)]:hidden">
								<Kbd>Duplo clique</Kbd> ou <Kbd>Enter</Kbd> fecha
								{draftLength > 0 ? (
									<span className="tabular-nums">· {draftLength} pontos</span>
								) : null}
							</span>
						) : null}
						<span className="flex items-center gap-1 [@media(hover:none)]:hidden">
							<Kbd>Esc</Kbd> cancela
						</span>
						<span className="flex items-center gap-1 [@media(hover:none)]:hidden">
							<Kbd>Delete</Kbd> apaga a selecionada
						</span>
					</p>
				</div>
			}
		>
			<VTTSegmented legend="Luz padrão da cena" className="max-sm:w-full">
				<GroupCaption>Cena</GroupCaption>
				<LevelButtons
					value={sceneLight}
					className="max-sm:flex-1"
					onPick={(level) => {
						if (level === sceneLight) return;
						void onUpdateScene?.(scene.id, { lightLevel: level });
					}}
				/>
			</VTTSegmented>
			<VTTOptionsDivider className="max-sm:hidden" />
			<VTTSegmented legend="Modo da ferramenta" className="max-sm:w-full">
				<GroupCaption>Modo</GroupCaption>
				{SHAPES.map(({ id, icon: Icon, hint }) => (
					<button
						type="button"
						key={id}
						title={`${LIGHT_SHAPE_LABEL[id]}: ${hint}`}
						aria-label={LIGHT_SHAPE_LABEL[id]}
						aria-pressed={drawShape === id}
						onClick={() => setDrawShape(id)}
						className={cn(
							segmentClass(drawShape === id),
							"min-w-11 max-sm:flex-1",
						)}
					>
						<Icon aria-hidden className="size-4" />
						<span className="hidden 2xl:inline">{LIGHT_SHAPE_LABEL[id]}</span>
					</button>
				))}
			</VTTSegmented>
			<VTTSegmented legend="Luz da nova área" className="max-sm:w-full">
				<GroupCaption>Nova</GroupCaption>
				<LevelButtons
					value={drawLevel}
					className="max-sm:flex-1"
					onPick={setDrawLevel}
				/>
			</VTTSegmented>
			{selected ? (
				<>
					<VTTOptionsDivider className="max-sm:hidden" />
					<VTTSegmented
						legend="Luz da área selecionada"
						className="max-sm:w-full"
					>
						<GroupCaption>Seleção</GroupCaption>
						<LevelButtons
							value={selected.level}
							className="max-sm:flex-1"
							onPick={(level) => void setLightZoneLevel(selected.id, level)}
						/>
					</VTTSegmented>
					<button
						type="button"
						aria-label="Apagar área selecionada"
						title="Apagar área selecionada"
						className={cn(actionClass, "min-w-11 justify-center")}
						onClick={() => void deleteLightZone(selected.id)}
					>
						<Trash2 aria-hidden className="size-4" />
						<span className="hidden 2xl:inline">Apagar</span>
					</button>
				</>
			) : null}
		</VTTOptionsBar>
	);
}
