import { BookOpen, Sparkles, Trash } from "lucide-react";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import { FeatSearchDialog } from "@/components/feat-search-dialog";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-tabs";
import type { Feat } from "@/lib/store";
import { getFeatsLabel, type SystemConfig } from "@/lib/systems";
import type {
	CharacterControl,
	CharacterRegister,
	CharacterSetValue,
} from "../types";
import { CustomFieldsRenderer } from "./custom-fields-renderer";

export function FeatsFields({
	register,
	config,
	control,
	setValue,
}: {
	register: CharacterRegister;
	config: SystemConfig;
	control: CharacterControl;
	setValue: CharacterSetValue;
}) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const system = useWatch({ control, name: "system" }) || "generic";
	const level = Number(useWatch({ control, name: "level" }) || 1);
	const featsList = useWatch({ control, name: "featsList" }) || [];

	const featsLabel = getFeatsLabel(system);

	const handleSelectFeat = (feat: Feat) => {
		if (
			featsList.some((f) => f.name.toLowerCase() === feat.name.toLowerCase())
		) {
			return;
		}
		setValue("featsList", [...featsList, feat]);
	};

	const handleRemoveFeat = (featId: string) => {
		setValue(
			"featsList",
			featsList.filter((f) => f.id !== featId),
		);
	};

	const hasTough = featsList.some(
		(f) =>
			f.name.toLowerCase() === "robusto" || f.name.toLowerCase() === "tough",
	);

	return (
		<FormSection title={featsLabel}>
			<CustomFieldsRenderer
				register={register}
				control={control}
				setValue={setValue}
				config={config}
				section="magic"
			/>

			{hasTough && (system === "dnd5e" || system === "dnd2024") && (
				<div className="mb-4 bg-primary/10 border border-primary/20 text-primary text-xs p-3 rounded-lg flex items-center gap-2">
					<Sparkles className="h-4 w-4 shrink-0 animate-pulse" />
					<div>
						<span className="font-bold">Talento Robusto Ativo:</span> Seu HP
						máximo final receberá um bônus dinâmico de{" "}
						<span className="font-extrabold font-mono text-[13px]">
							+{2 * level} HP
						</span>{" "}
						(+2 por nível) no modo de visualização.
					</div>
				</div>
			)}

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
						<Sparkles className="h-4 w-4 text-primary" />
						Lista de {featsLabel} Selecionados
					</h3>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setDialogOpen(true)}
						className="text-xs h-8 gap-1.5 cursor-pointer"
					>
						<BookOpen className="h-3.5 w-3.5" />
						Buscar no Compêndio
					</Button>
				</div>

				{featsList.length === 0 ? (
					<div className="rounded-xl border border-dashed border-border/60 bg-background/20 p-6 text-center text-xs text-muted-foreground">
						Nenhum {featsLabel.toLowerCase()} adicionado à ficha ainda. Use o
						botão acima para buscar e adicionar do compêndio.
					</div>
				) : (
					<div className="grid gap-2.5 sm:grid-cols-2">
						{featsList.map((feat) => (
							<div
								key={feat.id}
								className="flex items-start justify-between p-3 rounded-xl border border-border/60 bg-background/40 hover:border-border/80 transition-all group"
							>
								<div className="min-w-0 flex-1 pr-2">
									<div className="flex items-center gap-1.5 flex-wrap">
										<span className="font-display font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors">
											{feat.name}
										</span>
										<span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
											{feat.category || "Geral"}
										</span>
										{feat.source && (
											<span className="text-[8px] font-semibold text-white/50 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
												{feat.source}
											</span>
										)}
									</div>

									{feat.ability_increase && (
										<p className="text-[10px] text-emerald-400/90 font-medium mt-0.5">
											{feat.ability_increase}
										</p>
									)}

									{feat.description && (
										<p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
											{feat.description}
										</p>
									)}
								</div>

								<button
									type="button"
									onClick={() => handleRemoveFeat(feat.id)}
									title={`Remover ${feat.name}`}
									className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 active:scale-90"
								>
									<Trash className="h-4 w-4" />
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			<FeatSearchDialog
				system={system}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSelectFeat={handleSelectFeat}
				currentFeats={featsList}
			/>
		</FormSection>
	);
}
