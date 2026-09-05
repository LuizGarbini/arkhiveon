import { SaveSheetLayoutPanel } from "@/components/save-sheet-layout-panel";
import { SheetModuleEditor } from "@/components/sheet-module-editor";
import type { RpgSystem, SheetModuleConfig } from "@/lib/store";

export function WizardStepLayout({
	system,
	modules,
	onChangeModules,
	onAddCustomModule,
}: {
	system: RpgSystem;
	modules: SheetModuleConfig[];
	onChangeModules: (modules: SheetModuleConfig[]) => void;
	onAddCustomModule: (kind: "customText" | "customStats") => void;
}) {
	return (
		<div className="space-y-6">
			<div className="border-b border-border/40 pb-4">
				<h2 className="text-lg font-bold text-foreground">
					Organização dos Módulos da Ficha
				</h2>
				<p className="text-xs text-muted-foreground">
					Arraste os módulos para reorganizar as seções entre a coluna principal
					e lateral, ou oculte o que não precisar.
				</p>
			</div>

			<SheetModuleEditor
				mode="layout"
				modules={modules}
				onChange={onChangeModules}
				onAddCustom={onAddCustomModule}
			/>

			<SaveSheetLayoutPanel baseSystem={system} modules={modules} />
		</div>
	);
}
