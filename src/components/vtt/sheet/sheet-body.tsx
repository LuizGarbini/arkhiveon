import { Dices } from "lucide-react";
import {
	type ComponentProps,
	type ReactNode,
	type UIEvent,
	useId,
	useRef,
	useState,
} from "react";
import { EquipmentDialog } from "@/components/character-sheet/equipment/equipment-dialog";
import { Button } from "@/components/ui/button";
import { type EffectiveStats, speedUnitOf } from "@/core/rules";
import type { Character, Item } from "@/lib/store/types";
import type { SystemConfig } from "@/lib/systems";
import { normalizeTableResources } from "@/lib/table-resources";
import { cn } from "@/lib/utils";
import { visibleHpLabel } from "@/lib/vtt/character-hp";
import { nextHeroCollapsed } from "./hero-collapse";
import { AttacksTab } from "./sheet-attacks";
import { EquipmentTab } from "./sheet-equipment";
import { SheetCompactBar, SheetHero } from "./sheet-hero";
import { SheetHp } from "./sheet-hp";
import { DeathSaves } from "./sheet-resources";
import { SkillsTab } from "./sheet-skills";
import { SummaryTab } from "./sheet-summary";
import {
	type SheetTab,
	SheetTabs,
	sheetPanelId,
	sheetTabId,
} from "./sheet-tabs";
import type { SheetRolls } from "./sheet-types";
import type { SheetResourceApi } from "./use-sheet-resources";

type TabId = "resumo" | "ataques" | "pericias" | "equipamento";

const TABS: readonly (SheetTab & { id: TabId })[] = [
	{ id: "resumo", label: "Resumo" },
	{ id: "ataques", label: "Ataques" },
	{ id: "pericias", label: "Perícias" },
	{ id: "equipamento", label: "Equipamento" },
];

// O esmaecido na borda de baixo indica que há mais conteúdo ao rolar; o pb-4
// garante que o último item nunca fique sob ele.
const PANEL_CLASS =
	"min-h-0 flex-1 overflow-y-auto px-0.5 pb-4 [mask-image:linear-gradient(to_bottom,black_calc(100%-14px),transparent)]";

export interface SheetLastRoll {
	text: string;
	/** Foi rolada pelo servidor e está no chat da mesa. */
	shared: boolean;
}

/**
 * Corpo da ficha na mesa. Janela estreita: retrato, PV e condições no topo
 * (recolhem numa barra fina ao rolar), abas embaixo. Janela larga (≥ 44 rem,
 * medida pela própria janela): retrato e PV numa coluna à esquerda e as abas à
 * direita.
 */
export function SheetBody({
	character,
	config,
	hp,
	stats,
	itemsById,
	sceneUnit,
	showPassive,
	rolls,
	resources,
	conditions,
	lastRoll,
	diceLabel,
	portraitUrl,
	notice,
}: {
	character: Character | null;
	config: SystemConfig;
	/** Props do PV; ausente quando não há token (então não há PV a mostrar). */
	hp: ComponentProps<typeof SheetHp> | null;
	stats: EffectiveStats | null;
	itemsById: ReadonlyMap<string, Item>;
	sceneUnit?: string | null;
	showPassive: boolean;
	rolls: SheetRolls;
	resources: SheetResourceApi;
	/** Ids das condições do token (envenenado, caído…). */
	conditions: readonly string[];
	lastRoll: SheetLastRoll | null;
	/** "d20", "d100"… do sistema, para o botão de teste livre. */
	diceLabel: string;
	portraitUrl: string;
	/** Aviso quando a pessoa não vê ficha (sem acesso, ou token sem ficha). */
	notice?: ReactNode;
}) {
	const idPrefix = useId();
	const [tab, setTab] = useState<TabId>("resumo");
	const [equipmentOpen, setEquipmentOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const lastToggle = useRef(0);
	// Ataques, perícias e equipamento vêm dos itens vinculados: só o D&D 5e.
	const tabbed = character?.system === "dnd5e" && stats !== null;
	const active: TabId = tabbed ? tab : "resumo";
	const openEquipment = () => setEquipmentOpen(true);

	const setCollapsedNow = (next: boolean) => {
		lastToggle.current = Date.now();
		setCollapsed(next);
	};
	const onPanelScroll = (event: UIEvent<HTMLDivElement>) => {
		const el = event.currentTarget;
		const next = nextHeroCollapsed({
			collapsed,
			scrollTop: el.scrollTop,
			overflow: el.scrollHeight - el.clientHeight,
			sinceToggleMs: Date.now() - lastToggle.current,
		});
		if (next !== collapsed) setCollapsedNow(next);
	};
	const changeTab = (id: TabId) => {
		setTab(id);
		if (collapsed) setCollapsedNow(false);
	};

	const inspiration = character
		? normalizeTableResources(character.tableResources).inspiration
		: 0;
	const hpLabel = hp ? visibleHpLabel(hp.current, hp.max, hp.showMax) : "";
	const hpRatio = hp && hp.max > 0 ? Math.min(1, hp.current / hp.max) : 0;
	const lowHp = hp ? hp.max > 0 && hp.current / hp.max <= 0.25 : false;

	const panel = (() => {
		if (!character || !stats) return null;
		if (active === "ataques")
			return (
				<AttacksTab
					character={character}
					stats={stats}
					itemsById={itemsById}
					rolls={rolls}
					resources={resources}
					onOpenEquipment={openEquipment}
				/>
			);
		if (active === "pericias")
			return <SkillsTab character={character} stats={stats} rolls={rolls} />;
		if (active === "equipamento")
			return <EquipmentTab stats={stats} onOpenEquipment={openEquipment} />;
		return (
			<SummaryTab
				character={character}
				config={config}
				stats={stats}
				sceneUnit={sceneUnit}
				showPassive={showPassive}
				rolls={rolls}
				resources={resources}
			/>
		);
	})();

	// Janela estreita e recolhido: a barra fina no lugar do cabeçalho e do PV.
	const hideFull = collapsed ? "hidden @[44rem]:flex" : "";

	return (
		<div className="@container flex h-full min-h-[30rem] flex-col">
			<div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-4 @[44rem]:grid-cols-[15.5rem_minmax(0,1fr)] @[44rem]:grid-rows-1 @[44rem]:gap-5">
				<aside className="flex min-w-0 flex-col gap-4 @[44rem]:min-h-0 @[44rem]:overflow-y-auto">
					{character && collapsed ? (
						<div className="@[44rem]:hidden">
							<SheetCompactBar
								character={character}
								portraitUrl={portraitUrl}
								hpLabel={hpLabel}
								hpRatio={hpRatio}
								low={lowHp}
								onExpand={() => setCollapsedNow(false)}
							/>
						</div>
					) : null}
					<div className={cn("flex flex-col gap-4", hideFull)}>
						{character ? (
							<SheetHero
								character={character}
								portraitUrl={portraitUrl}
								conditions={conditions}
								inspiration={inspiration}
								canEditInspiration={resources.canEdit}
								canGrantInspiration={resources.isStaff}
								onInspirationChange={(next) =>
									resources.save({ inspiration: next })
								}
								onOpenEquipment={tabbed ? openEquipment : undefined}
							/>
						) : (
							notice
						)}
						{hp ? <SheetHp {...hp} /> : null}
						{character && hp && hp.current === 0 ? (
							<DeathSaves character={character} resources={resources} />
						) : null}
					</div>
				</aside>

				<div className="flex min-h-0 min-w-0 flex-col gap-3">
					{tabbed ? (
						<SheetTabs
							tabs={TABS}
							value={active}
							onChange={(id) => changeTab(id as TabId)}
							idPrefix={idPrefix}
						/>
					) : null}
					{panel ? (
						tabbed ? (
							<div
								key={active}
								role="tabpanel"
								id={sheetPanelId(idPrefix, active)}
								aria-labelledby={sheetTabId(idPrefix, active)}
								className={PANEL_CLASS}
								onScroll={onPanelScroll}
							>
								{panel}
							</div>
						) : (
							<div className={PANEL_CLASS} onScroll={onPanelScroll}>
								{panel}
							</div>
						)
					) : (
						<div className="flex-1" />
					)}

					<div className="space-y-2 border-t border-border/60 pt-3">
						{lastRoll ? (
							<div
								aria-live="polite"
								className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2"
							>
								<Dices className="size-4 shrink-0 text-primary" aria-hidden />
								<p className="min-w-0 flex-1 truncate font-mono text-xs font-semibold tabular-nums text-foreground">
									{lastRoll.text}
								</p>
								{lastRoll.shared ? (
									<span className="shrink-0 text-[11px] text-muted-foreground">
										no chat da mesa
									</span>
								) : null}
							</div>
						) : null}
						<Button
							type="button"
							variant="outline"
							disabled={rolls.rolling}
							className="min-h-11 w-full gap-2"
							onClick={() => rolls.check("Teste livre", 0)}
						>
							<Dices className="size-4" aria-hidden />
							{rolls.rolling ? "Rolando…" : `Rolar ${diceLabel}`}
						</Button>
					</div>
				</div>
			</div>

			{character && tabbed ? (
				<EquipmentDialog
					character={character}
					open={equipmentOpen}
					onOpenChange={setEquipmentOpen}
					speedUnit={speedUnitOf(character, config.speedUnit)}
					sceneUnit={sceneUnit}
				/>
			) : null}
		</div>
	);
}
