import { BookmarkPlus, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSavedSheetTemplate } from "@/lib/sheet-modules";
import type { CustomTemplate, RpgSystem, SheetModuleConfig } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { SYSTEM_CONFIG } from "@/lib/systems";

type SaveSheetLayoutPanelProps = {
	baseSystem: RpgSystem;
	modules: SheetModuleConfig[];
	onSaved?: (template: CustomTemplate) => void;
};

export function SaveSheetLayoutPanel({
	baseSystem,
	modules,
	onSaved,
}: SaveSheetLayoutPanelProps) {
	const addTemplate = useRPGStore((state) => state.addTemplate);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [savedName, setSavedName] = useState<string | null>(null);
	const baseLabel = SYSTEM_CONFIG[baseSystem]?.label ?? baseSystem;
	const canSave = name.trim().length > 0;

	function handleSave() {
		if (!canSave) return;
		const template = createSavedSheetTemplate({
			name,
			description,
			baseSystem,
			modules,
		});
		addTemplate(template);
		setSavedName(template.name);
		onSaved?.(template);
	}

	return (
		<section className="rounded-2xl border border-border/70 bg-background/45 p-5">
			<div className="flex items-start gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
					<BookmarkPlus className="h-5 w-5" />
				</div>
				<div className="min-w-0 flex-1 space-y-4">
					<div>
						<p className="text-[12px] font-bold text-foreground">
							Salvar este layout
						</p>
						<p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
							Guarde a organização dos blocos como um sistema personalizado
							(baseado em {baseLabel}). Depois você escolhe esse layout ao criar
							novas fichas.
						</p>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<Field label="Nome do layout" required>
							<Input
								value={name}
								onChange={(event) => {
									setName(event.target.value);
									setSavedName(null);
								}}
								placeholder="Ex: Pathfinder personalizado"
							/>
						</Field>
						<Field label="Descrição (opcional)">
							<Textarea
								rows={2}
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								placeholder="Como você usa este layout..."
							/>
						</Field>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<Button
							type="button"
							size="sm"
							className="gap-2"
							disabled={!canSave}
							onClick={handleSave}
						>
							<BookmarkPlus className="h-4 w-4" />
							Salvar layout
						</Button>
						{savedName ? (
							<p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary">
								<Check className="h-3.5 w-3.5" />
								&quot;{savedName}&quot; disponível na escolha de sistema
							</p>
						) : null}
					</div>
				</div>
			</div>
		</section>
	);
}
