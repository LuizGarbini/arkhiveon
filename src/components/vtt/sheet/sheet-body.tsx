import { Dices } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { EquipmentDialog } from "@/components/character-sheet/equipment/equipment-dialog";
import { Button } from "@/components/ui/button";
import { type EffectiveStats, speedUnitOf } from "@/core/rules";
import type { Character, Item } from "@/lib/store/types";
import type { SystemConfig } from "@/lib/systems";
import { AttacksTab } from "./sheet-attacks";
import { EquipmentTab } from "./sheet-equipment";
import { SheetHero } from "./sheet-hero";
import { SheetHp } from "./sheet-hp";
import { SkillsTab } from "./sheet-skills";
import { SummaryTab } from "./sheet-summary";
import {
	type SheetTab,
	SheetTabs,
	sheetPanelId,
	sheetTabId,
} from "./sheet-tabs";
import type { SheetRolls } from "./sheet-types";

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
 * Corpo da ficha na mesa. Janela estreita: retrato e PV no topo, abas embaixo.
 * Janela larga (≥ 44 rem, medida pela própria janela): retrato e PV numa coluna
 * à esquerda e as abas à direita.
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
	// Ataques, perícias e equipamento vêm dos itens vinculados: só o D&D 5e.
	const tabbed = character?.system === "dnd5e" && stats !== null;
	const active: TabId = tabbed ? tab : "resumo";
	const openEquipment = () => setEquipmentOpen(true);

	const panel = (() => {
		if (!character || !stats) return null;
		if (active === "ataques")
			return (
				<AttacksTab
					character={character}
					stats={stats}
					itemsById={itemsById}
					rolls={rolls}
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
			/>
		);
	})();

	return (
		<div className="@container flex h-full min-h-[30rem] flex-col">
			<div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 @[44rem]:grid-cols-[15.5rem_minmax(0,1fr)] @[44rem]:grid-rows-1 @[44rem]:gap-5">
				<aside className="flex flex-col gap-4 @[44rem]:min-h-0 @[44rem]:overflow-y-auto">
					{character ? (
						<SheetHero
							character={character}
							portraitUrl={portraitUrl}
							onOpenEquipment={tabbed ? openEquipment : undefined}
						/>
					) : (
						notice
					)}
					{hp ? <SheetHp {...hp} /> : null}
				</aside>

				<div className="flex min-h-0 flex-col gap-3">
					{tabbed ? (
						<SheetTabs
							tabs={TABS}
							value={active}
							onChange={(id) => setTab(id as TabId)}
							idPrefix={idPrefix}
						/>
					) : null}
					{panel ? (
						tabbed ? (
							<div
								role="tabpanel"
								id={sheetPanelId(idPrefix, active)}
								aria-labelledby={sheetTabId(idPrefix, active)}
								className={PANEL_CLASS}
							>
								{panel}
							</div>
						) : (
							<div className={PANEL_CLASS}>{panel}</div>
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
