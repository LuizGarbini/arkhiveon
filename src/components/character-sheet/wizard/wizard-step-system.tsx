import { CrisImportDialog } from "@/components/ordem/cris-import-dialog";
import {
	SystemPicker,
	type SystemPickerSelection,
} from "@/components/system-picker";
import type { RpgSystem } from "@/lib/store";

export function WizardStepSystem({
	system,
	selectedLayoutTemplateId,
	onSelectSystem,
	onImportSuccess,
}: {
	system: RpgSystem;
	selectedLayoutTemplateId?: string;
	onSelectSystem: (selection: SystemPickerSelection) => void;
	onImportSuccess?: (characterId: string) => void;
}) {
	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
				<div>
					<h2 className="text-lg font-bold text-foreground">
						Escolha o Sistema de RPG
					</h2>
					<p className="text-xs text-muted-foreground">
						O sistema define os atributos, perícias, magias e layout padrão da
						ficha.
					</p>
				</div>
				{system === "ordem" && (
					<CrisImportDialog onImportSuccess={onImportSuccess} />
				)}
			</div>

			<SystemPicker
				value={system}
				layoutTemplateId={selectedLayoutTemplateId}
				onSelect={onSelectSystem}
			/>
		</div>
	);
}
