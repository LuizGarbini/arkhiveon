import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
	buildCharacterFormDefaults,
	type CharacterFormValues,
	CharacterModuleFields,
} from "@/components/character-sheet/fields";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FormTabs } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	isCustomSheetModule,
	lockSheetModuleTitle,
	SHEET_MODULE_LABELS,
} from "@/lib/sheet-modules";
import type {
	Character,
	SheetLayoutConfig,
	SheetModuleConfig,
	SheetModuleKind,
} from "@/lib/store";
import { SYSTEM_CONFIG } from "@/lib/systems";
import { cn } from "@/lib/utils";

export function ModuleEditorDialog({
	character,
	module,
	layout,
	open,
	onOpenChange,
	onSave,
}: {
	character: Character;
	module: SheetModuleConfig | null;
	layout: SheetLayoutConfig;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (
		patch: Partial<SheetModuleConfig>,
		values: CharacterFormValues,
	) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{open && module && (
				<ModuleEditorDialogForm
					key={`${character.id}-${module.id}`}
					character={character}
					initialModule={module}
					layout={layout}
					onCancel={() => onOpenChange(false)}
					onSave={onSave}
				/>
			)}
		</Dialog>
	);
}

function ModuleEditorDialogForm({
	character,
	initialModule,
	layout,
	onCancel,
	onSave,
}: {
	character: Character;
	initialModule: SheetModuleConfig;
	layout: SheetLayoutConfig;
	onCancel: () => void;
	onSave: (
		patch: Partial<SheetModuleConfig>,
		values: CharacterFormValues,
	) => void;
}) {
	const form = useForm<CharacterFormValues>({
		defaultValues: buildCharacterFormDefaults(character),
	});
	const {
		register,
		control,
		setValue,
		handleSubmit,
		formState: { errors },
	} = form;

	const [activeModuleId, setActiveModuleId] = useState<string>(
		initialModule.id,
	);
	const [draft, setDraft] = useState<Partial<SheetModuleConfig>>({
		title: initialModule.title,
		content: initialModule.content ?? "",
		enabled: initialModule.enabled,
		column: initialModule.column ?? "main",
	});

	const config = SYSTEM_CONFIG[character.system] ?? SYSTEM_CONFIG.generic;
	const [titleError, setTitleError] = useState<string | null>(null);
	const [prevIndex, setPrevIndex] = useState(
		layout.modules.findIndex((m) => m.id === initialModule.id),
	);
	const [slideDirection, setSlideDirection] = useState<"left" | "right">(
		"left",
	);

	const activeModule = useMemo(() => {
		return layout.modules.find((m) => m.id === activeModuleId) || initialModule;
	}, [layout.modules, activeModuleId, initialModule]);

	const tabs = useMemo(() => {
		return layout.modules.map((m) => ({
			id: m.id,
			label: m.title || SHEET_MODULE_LABELS[m.kind] || m.kind,
		}));
	}, [layout.modules]);

	const validateTitle = (val: string) => {
		const trimmed = val.trim();
		if (!trimmed) {
			return "O título é obrigatório";
		}
		if (
			trimmed.toLowerCase() === "novo texto livre" ||
			trimmed.toLowerCase() === "novo bloco de stats"
		) {
			return "Por favor, digite um título personalizado e diferente do padrão";
		}
		return null;
	};

	const handleTabChange = (nextId: string) => {
		const nextIndex = tabs.findIndex((t) => t.id === nextId);
		if (nextIndex !== -1) {
			setSlideDirection(nextIndex < prevIndex ? "right" : "left");
			setPrevIndex(nextIndex);
		}

		const nextMod = layout.modules.find((m) => m.id === nextId);
		if (nextMod) {
			setDraft({
				title: nextMod.title,
				content: nextMod.content ?? "",
				enabled: nextMod.enabled,
				column: nextMod.column ?? "main",
			});
			setTitleError(null);
		}

		setActiveModuleId(nextId);
	};

	function submit(values: CharacterFormValues) {
		if (!activeModule) return;
		const isCustom = isCustomSheetModule(activeModule);
		if (isCustom) {
			const err = validateTitle(draft.title ?? "");
			if (err) {
				setTitleError(err);
				return;
			}
		}

		const patch = buildModuleSavePatch(activeModule, draft);
		const nextModules = layout.modules.map((m) =>
			lockSheetModuleTitle(m.id === activeModule.id ? { ...m, ...patch } : m),
		);
		onSave(patch, {
			...values,
			sheetLayout: {
				...layout,
				modules: nextModules,
			},
		});
	}

	const isCustom = isCustomSheetModule(activeModule);

	return (
		<DialogContent className="max-w-3xl! h-[680px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
			<form
				onSubmit={handleSubmit(submit)}
				className="flex h-full min-h-0 flex-col"
			>
				<DialogHeader className="border-b border-border px-6 pt-6 pb-4">
					<div className="flex items-start justify-between gap-3">
						<div>
							<DialogTitle className="font-display text-lg">
								Editar módulo
							</DialogTitle>
							<DialogDescription>
								Altere o conteúdo e a configuração deste bloco da ficha.
							</DialogDescription>
						</div>
					</div>
					<div className="mt-3">
						<FormTabs
							tabs={tabs}
							value={activeModuleId}
							onChange={handleTabChange}
						/>
					</div>
				</DialogHeader>

				<div
					key={activeModuleId}
					className={cn(
						"flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6",
						slideDirection === "left"
							? "t-tab-slide-left"
							: "t-tab-slide-right",
					)}
				>
					<div
						className={cn(
							"grid gap-3",
							isCustom ? "sm:grid-cols-[1fr_160px_140px]" : "sm:grid-cols-2",
						)}
					>
						{isCustom && (
							<Field
								label="Título do módulo"
								error={titleError || undefined}
								required
							>
								<Input
									value={draft.title ?? ""}
									placeholder="Ex: História de fundo"
									className="min-h-[44px]"
									onChange={(event) => {
										const val = event.target.value;
										setDraft((current) => ({
											...current,
											title: val,
										}));
										setTitleError(validateTitle(val));
									}}
								/>
							</Field>
						)}
						<Field label="Coluna">
							<Select
								value={draft.column ?? "main"}
								className="min-h-[44px]"
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										column: event.target.value as "main" | "side",
									}))
								}
							>
								<option value="main">Principal</option>
								<option value="side">Lateral</option>
							</Select>
						</Field>
						<Field label="Visibilidade">
							<Select
								value={draft.enabled === false ? "false" : "true"}
								className="min-h-[44px]"
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										enabled: event.target.value === "true",
									}))
								}
							>
								<option value="true">Ativo</option>
								<option value="false">Oculto</option>
							</Select>
						</Field>
					</div>

					{isCustom ? (
						<Field label="Conteúdo customizado">
							<Textarea
								rows={8}
								value={draft.content ?? ""}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										content: event.target.value,
									}))
								}
								placeholder="Escreva o conteúdo do módulo..."
							/>
						</Field>
					) : (
						<CharacterModuleFields
							kind={activeModule.kind as SheetModuleKind}
							register={register}
							control={control}
							setValue={setValue}
							config={config}
							errors={errors}
						/>
					)}
				</div>

				<div className="flex items-center justify-end gap-2 border-t border-border bg-card-elevated/40 px-6 py-3">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={onCancel}
						className="min-h-[44px] cursor-pointer"
					>
						Cancelar
					</Button>
					<Button
						type="submit"
						size="sm"
						className="min-h-[44px] cursor-pointer"
					>
						Salvar módulo
					</Button>
				</div>
			</form>
		</DialogContent>
	);
}

/**
 * Patch persisted when saving a module in the editor. System modules never
 * persist a title from the draft: it is locked to SHEET_MODULE_LABELS[kind].
 */
export function buildModuleSavePatch(
	module: SheetModuleConfig,
	draft: Partial<SheetModuleConfig>,
): Partial<SheetModuleConfig> {
	if (isCustomSheetModule(module) || module.kind === "custom_template_fields") {
		return draft;
	}
	const { title: _ignored, ...rest } = draft;
	return { ...rest, title: SHEET_MODULE_LABELS[module.kind] };
}
