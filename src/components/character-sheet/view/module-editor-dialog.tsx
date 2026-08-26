import { useEffect, useMemo, useRef, useState } from "react";
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
import { isCustomSheetModule, SHEET_MODULE_LABELS } from "@/lib/sheet-modules";
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
	const form = useForm<CharacterFormValues>({
		defaultValues: buildCharacterFormDefaults(character),
	});
	const {
		register,
		control,
		setValue,
		handleSubmit,
		reset,
		formState: { errors },
	} = form;
	const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
	const [draft, setDraft] = useState<Partial<SheetModuleConfig>>({});
	const config = SYSTEM_CONFIG[character.system] ?? SYSTEM_CONFIG.generic;
	const [titleError, setTitleError] = useState<string | null>(null);
	const [prevIndex, setPrevIndex] = useState(-1);
	const [slideDirection, setSlideDirection] = useState<"left" | "right">(
		"left",
	);

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

	useEffect(() => {
		if (module && open) {
			setActiveModuleId(module.id);
		}
	}, [module, open]);

	const activeModule = useMemo(() => {
		return layout.modules.find((m) => m.id === activeModuleId) || module;
	}, [layout.modules, activeModuleId, module]);

	const wasOpen = useRef(false);

	useEffect(() => {
		if (!activeModule) return;
		if (open && !wasOpen.current) {
			reset(buildCharacterFormDefaults(character));
			setDraft({
				title: activeModule.title,
				content: activeModule.content ?? "",
				enabled: activeModule.enabled,
				column: activeModule.column ?? "main",
			});
			setTitleError(null);
		}
		wasOpen.current = open;
	}, [open, character, activeModule, reset]);

	const tabs = useMemo(() => {
		return layout.modules.map((m) => ({
			id: m.id,
			label: m.title || SHEET_MODULE_LABELS[m.kind] || m.kind,
		}));
	}, [layout.modules]);

	const handleTabChange = (nextId: string) => {
		const index = tabs.findIndex((t) => t.id === nextId);
		if (index !== -1) {
			if (prevIndex !== -1 && index < prevIndex) {
				setSlideDirection("right");
			} else {
				setSlideDirection("left");
			}
			setPrevIndex(index);
		}
		setActiveModuleId(nextId);
	};

	if (!activeModule) return null;

	function submit(values: CharacterFormValues) {
		if (!activeModule) return;
		const err = validateTitle(draft.title ?? "");
		if (err) {
			setTitleError(err);
			return;
		}
		const nextModules = layout.modules.map((m) =>
			m.id === activeModule.id ? { ...m, ...draft } : m,
		);
		onSave(draft, {
			...values,
			sheetLayout: {
				...layout,
				modules: nextModules,
			},
		});
	}

	const isCustom = isCustomSheetModule(activeModule);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
								value={activeModuleId || ""}
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
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" size="sm">
							Salvar módulo
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
