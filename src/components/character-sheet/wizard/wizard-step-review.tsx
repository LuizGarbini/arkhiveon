import { Button } from "@/components/ui/button";
import type { SheetModuleConfig } from "@/lib/store";
import type { SystemConfig } from "@/lib/systems";

export function WizardStepReview({
	config,
	characterName,
	characterClass,
	characterRace,
	characterLevel,
	characterBackground,
	modules,
	selectedTemplateName,
	onBackToDetails,
}: {
	config: SystemConfig;
	characterName?: string;
	characterClass?: string;
	characterRace?: string;
	characterLevel?: number | string;
	characterBackground?: string;
	modules: SheetModuleConfig[];
	selectedTemplateName?: string;
	onBackToDetails: () => void;
}) {
	const enabledModules = modules.filter((m) => m.enabled);

	return (
		<div className="space-y-6">
			<div className="border-b border-border/40 pb-4">
				<h2 className="text-lg font-bold text-foreground">
					Revisão & Confirmação Final
				</h2>
				<p className="text-xs text-muted-foreground">
					Confira o resumo das informações antes de criar a ficha do seu
					personagem.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<ReviewCard
					label="Sistema / Template"
					value={selectedTemplateName || config.label}
				/>
				<ReviewCard
					label="Nome do Personagem"
					value={characterName || "Sem nome"}
				/>
				<ReviewCard
					label="Raça / Origem"
					value={characterRace || characterBackground || "Não definida"}
				/>
				<ReviewCard
					label="Classe & Nível"
					value={`${characterClass || "Aventureiro"} (Nv. ${characterLevel || 1})`}
				/>
			</div>

			<div className="rounded-2xl border border-border/70 bg-card/50 p-5 space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
						Módulos da Ficha ({enabledModules.length} ativos)
					</h3>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={onBackToDetails}
						className="text-xs text-primary hover:underline h-auto p-0 cursor-pointer"
					>
						Editar detalhes
					</Button>
				</div>
				<div className="flex flex-wrap gap-2">
					{enabledModules.map((m) => (
						<span
							key={m.id}
							className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-1 text-xs font-semibold text-foreground"
						>
							{m.title || m.kind}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}

function ReviewCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 p-4">
			<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
				{label}
			</p>
			<p className="font-display mt-1 text-base font-bold text-foreground truncate">
				{value}
			</p>
		</div>
	);
}
