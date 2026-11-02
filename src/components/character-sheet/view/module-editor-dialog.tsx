import { type RefObject, useId, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
	buildCharacterFormDefaults,
	type CharacterFormValues,
	CharacterModuleFields,
	pickChangedFormValues,
	sanitizeCharacterFormValues,
} from "@/components/character-sheet/fields";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	isDialogDismissSaveReason,
} from "@/components/ui/dialog";
import { Field, FormTabs } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isDeepEqual } from "@/lib/deep-equal";
import {
	clearDraft,
	isVacantDraft,
	persistDraft,
	readRestorableDraft,
} from "@/lib/form-draft";
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

const SHEET_MODULE_DRAFT_FORM_ID = "sheet-module";
const MODULE_TITLE_INPUT_ID = "sheet-module-title";

type SheetModuleDraft = {
	title: string;
	content: string;
	column: "main" | "side";
	enabled: boolean;
	form: CharacterFormValues;
};

type ModuleDismiss = {
	run: () => void | Promise<void>;
	discard: () => void;
};

function moduleDraftEntityId(characterId: string, moduleId: string) {
	return `${characterId}:${moduleId}`;
}

function isPromiseLike(value: void | Promise<void>): value is Promise<void> {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof value.then === "function"
	);
}

/** O texto do servidor fica de fora: o campo mostra sempre esta frase. */
function saveErrorMessage(_error: unknown): string {
	return "Não foi possível salvar. Tente de novo.";
}

function moduleFields(source: {
	title?: string;
	content?: string;
	column?: "main" | "side";
	enabled?: boolean;
}) {
	return {
		title: source.title ?? "",
		content: source.content ?? "",
		column: source.column ?? "main",
		enabled: source.enabled !== false,
	};
}

function moduleDraftPolicy(character: Character, module: SheetModuleConfig) {
	return {
		saved: {
			title: module.title,
			content: module.content ?? "",
			column: module.column ?? "main",
			enabled: module.enabled,
			form: sanitizeCharacterFormValues(buildCharacterFormDefaults(character)),
		} satisfies SheetModuleDraft,
		required: (isCustomSheetModule(module) ? ["title"] : []) as Array<"title">,
	};
}

/** Nome do personagem só é obrigatório no módulo de identidade. */
function identityNameMissing(
	module: SheetModuleConfig,
	form: { characterName?: string },
) {
	return module.kind === "identity" && (form.characterName ?? "").trim() === "";
}

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
		changes: Partial<CharacterFormValues>,
	) => void | Promise<void>;
}) {
	const dismissRef = useRef<ModuleDismiss>({
		run: () => {},
		discard: () => {},
	});
	if (!open || !module) {
		dismissRef.current = { run: () => {}, discard: () => {} };
	}

	return (
		<Dialog
			open={open}
			onDismissSave={() => dismissRef.current.run()}
			onOpenChange={(next, details) => {
				if (!next && !isDialogDismissSaveReason(details.reason)) {
					dismissRef.current.discard();
				}
				onOpenChange(next);
			}}
		>
			{open && module && (
				<ModuleEditorDialogForm
					key={`${character.id}-${module.id}`}
					character={character}
					initialModule={module}
					layout={layout}
					dismissRef={dismissRef}
					onCancel={() => {
						dismissRef.current.discard();
						onOpenChange(false);
					}}
					onClose={() => onOpenChange(false)}
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
	dismissRef,
	onCancel,
	onClose,
	onSave,
}: {
	character: Character;
	initialModule: SheetModuleConfig;
	layout: SheetLayoutConfig;
	dismissRef: RefObject<ModuleDismiss>;
	onCancel: () => void;
	onClose: () => void;
	onSave: (
		patch: Partial<SheetModuleConfig>,
		changes: Partial<CharacterFormValues>,
	) => void | Promise<void>;
}) {
	const [openedCharacter] = useState(character);
	const [openedLayout] = useState(layout);
	const savedForm = sanitizeCharacterFormValues(
		buildCharacterFormDefaults(openedCharacter),
	);
	const [restored] = useState(() => {
		const entityId = moduleDraftEntityId(character.id, initialModule.id);
		const stored = readRestorableDraft<SheetModuleDraft>(
			SHEET_MODULE_DRAFT_FORM_ID,
			entityId,
			moduleDraftPolicy(character, initialModule),
		);
		if (!stored?.form || typeof stored.form !== "object") {
			if (stored) clearDraft(SHEET_MODULE_DRAFT_FORM_ID, entityId);
			return null;
		}
		if (identityNameMissing(initialModule, stored.form)) {
			clearDraft(SHEET_MODULE_DRAFT_FORM_ID, entityId);
			return null;
		}
		return stored;
	});
	const openedForm = restored
		? sanitizeCharacterFormValues({ ...savedForm, ...restored.form })
		: savedForm;
	const openedModule = restored
		? {
				title: restored.title,
				content: restored.content,
				enabled: restored.enabled,
				column: restored.column,
			}
		: {
				title: initialModule.title,
				content: initialModule.content ?? "",
				enabled: initialModule.enabled,
				column: initialModule.column ?? "main",
			};
	const form = useForm<CharacterFormValues>({
		defaultValues: openedForm,
	});
	const {
		register,
		control,
		setValue,
		handleSubmit,
		getValues,
		trigger,
		formState: { errors },
	} = form;

	const [activeModuleId, setActiveModuleId] = useState<string>(
		initialModule.id,
	);
	const [draft, setDraft] = useState<Partial<SheetModuleConfig>>(openedModule);
	const sessionModule = useRef(openedModule);
	const sessionForm = useRef(openedForm);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const saveErrorId = useId();
	const flight = useRef<Promise<void> | null>(null);

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
			const nextDraft = {
				title: nextMod.title,
				content: nextMod.content ?? "",
				enabled: nextMod.enabled,
				column: nextMod.column ?? ("main" as const),
			};
			sessionModule.current = nextDraft;
			setDraft(nextDraft);
			setTitleError(null);
			setSaveError(null);
		}

		setActiveModuleId(nextId);
	};

	function clearModuleDraft(moduleId: string) {
		clearDraft(
			SHEET_MODULE_DRAFT_FORM_ID,
			moduleDraftEntityId(character.id, moduleId),
		);
	}

	function currentModuleDraft(): SheetModuleDraft {
		return {
			...moduleFields(draft),
			form: sanitizeCharacterFormValues(getValues()),
		};
	}

	function baselineModule(moduleId: string) {
		return (
			openedLayout.modules.find((item) => item.id === moduleId) ?? initialModule
		);
	}

	function moduleDraftVacant(
		module: SheetModuleConfig,
		values: SheetModuleDraft,
	) {
		return (
			identityNameMissing(module, values.form) ||
			isVacantDraft(
				values,
				moduleDraftPolicy(openedCharacter, baselineModule(module.id)),
			)
		);
	}

	function rememberDraft(module: SheetModuleConfig) {
		const values = currentModuleDraft();
		if (moduleDraftVacant(module, values)) {
			clearModuleDraft(module.id);
			return;
		}
		persistDraft(
			SHEET_MODULE_DRAFT_FORM_ID,
			moduleDraftEntityId(openedCharacter.id, module.id),
			values,
			moduleDraftPolicy(openedCharacter, baselineModule(module.id)),
		);
	}

	function planModuleSave(values: CharacterFormValues) {
		const patch = buildModuleSavePatch(activeModule, draft);
		const nextModules = layout.modules.map((m) =>
			lockSheetModuleTitle(m.id === activeModule.id ? { ...m, ...patch } : m),
		);
		// Só os campos alterados: a ficha aberta pode estar desatualizada
		// (outra aba salvou a mochila) e regravar tudo apagaria isso.
		const changes = pickChangedFormValues(
			sanitizeCharacterFormValues(values),
			buildCharacterFormDefaults(openedCharacter),
		);
		const moduleChanged = !isDeepEqual(
			nextModules.find((m) => m.id === activeModule.id),
			lockSheetModuleTitle(baselineModule(activeModule.id)),
		);
		if (moduleChanged) {
			changes.sheetLayout = { ...layout, modules: nextModules };
		} else {
			delete changes.sheetLayout;
		}
		const unchanged =
			!moduleChanged &&
			Object.keys(changes).filter((key) => key !== "sheetLayout").length === 0;
		return { patch, changes, unchanged };
	}

	function untouchedSinceOpen(values: CharacterFormValues) {
		const formChanges = pickChangedFormValues(
			sanitizeCharacterFormValues(values),
			sessionForm.current,
		);
		return (
			Object.keys(formChanges).length === 0 &&
			isDeepEqual(moduleFields(draft), moduleFields(sessionModule.current))
		);
	}

	function failSave(error: unknown, module: SheetModuleConfig) {
		rememberDraft(module);
		setSaveError(saveErrorMessage(error));
		setSaving(false);
		return Promise.reject(error);
	}

	function settle(
		result: void | Promise<void>,
		module: SheetModuleConfig,
	): void | Promise<void> {
		if (!isPromiseLike(result)) {
			clearModuleDraft(module.id);
			return;
		}
		setSaving(true);
		let pending: Promise<void>;
		pending = Promise.resolve(result).then(
			() => {
				if (flight.current === pending) flight.current = null;
				clearModuleDraft(module.id);
			},
			(error: unknown) => {
				if (flight.current === pending) flight.current = null;
				return failSave(error, module);
			},
		);
		flight.current = pending;
		return pending;
	}

	function beginSave(values: CharacterFormValues): void | Promise<void> {
		setSaveError(null);
		const planned = planModuleSave(values);
		let result: void | Promise<void>;
		try {
			result = onSave(planned.patch, planned.changes);
		} catch (error) {
			return failSave(error, activeModule);
		}
		return settle(result, activeModule);
	}

	dismissRef.current.discard = () => {
		clearModuleDraft(activeModuleId);
		clearModuleDraft(initialModule.id);
	};

	dismissRef.current.run = async () => {
		if (flight.current) return flight.current;
		const values = getValues();
		const custom = isCustomSheetModule(activeModule);
		const titleErr = custom ? validateTitle(draft.title ?? "") : null;
		const planned = planModuleSave(values);
		if (
			moduleDraftVacant(activeModule, currentModuleDraft()) ||
			planned.unchanged
		) {
			clearModuleDraft(activeModule.id);
			return;
		}
		if (untouchedSinceOpen(values)) return;
		if (titleErr || !(await trigger())) {
			rememberDraft(activeModule);
			return;
		}
		const pending = beginSave(values);
		if (isPromiseLike(pending)) await pending;
	};

	function submit(values: CharacterFormValues) {
		if (saving || flight.current) return;
		const custom = isCustomSheetModule(activeModule);
		if (custom) {
			const err = validateTitle(draft.title ?? "");
			if (err) {
				setTitleError(err);
				return;
			}
		}
		const pending = beginSave(values);
		if (isPromiseLike(pending)) {
			void Promise.resolve(pending).then(
				() => onClose(),
				() => {},
			);
			return;
		}
		onClose();
	}

	const isCustom = isCustomSheetModule(activeModule);

	return (
		<DialogContent className="max-w-3xl! h-[680px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
			<form
				onSubmit={handleSubmit(submit)}
				className="flex h-full min-h-0 flex-col"
				aria-describedby={saveError ? saveErrorId : undefined}
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
								htmlFor={MODULE_TITLE_INPUT_ID}
								error={titleError || undefined}
								required
							>
								<Input
									id={MODULE_TITLE_INPUT_ID}
									value={draft.title ?? ""}
									placeholder="Ex: História de fundo"
									className="min-h-[44px]"
									aria-invalid={saveError || titleError ? true : undefined}
									aria-describedby={saveError ? saveErrorId : undefined}
									spellCheck={false}
									autoComplete="off"
									onChange={(event) => {
										const val = event.target.value;
										setDraft((current) => ({
											...current,
											title: val,
										}));
										setTitleError(validateTitle(val));
										if (saveError) setSaveError(null);
									}}
								/>
							</Field>
						)}
						<Field label="Coluna">
							<Select
								value={draft.column ?? "main"}
								className="min-h-[44px]"
								onChange={(event) => {
									setDraft((current) => ({
										...current,
										column: event.target.value as "main" | "side",
									}));
									if (saveError) setSaveError(null);
								}}
							>
								<option value="main">Principal</option>
								<option value="side">Lateral</option>
							</Select>
						</Field>
						<Field label="Visibilidade">
							<Select
								value={draft.enabled === false ? "false" : "true"}
								className="min-h-[44px]"
								onChange={(event) => {
									setDraft((current) => ({
										...current,
										enabled: event.target.value === "true",
									}));
									if (saveError) setSaveError(null);
								}}
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
								onChange={(event) => {
									setDraft((current) => ({
										...current,
										content: event.target.value,
									}));
									if (saveError) setSaveError(null);
								}}
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

				<div className="flex flex-col gap-2 border-t border-border bg-card-elevated/40 px-6 py-3">
					{saveError ? (
						<p
							id={saveErrorId}
							role="alert"
							className="text-[12px] leading-snug text-destructive"
						>
							{saveError}
						</p>
					) : null}
					<div className="flex items-center justify-end gap-2">
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
							disabled={saving}
							aria-describedby={saveError ? saveErrorId : undefined}
							className="min-h-[44px] cursor-pointer"
						>
							Salvar módulo
						</Button>
					</div>
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
