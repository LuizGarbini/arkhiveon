import {
	ArrowRight,
	History,
	Loader2,
	Minus,
	Plus,
	Shield,
	SlidersHorizontal,
	Undo2,
	WifiOff,
} from "lucide-react";
import {
	type KeyboardEvent,
	type ReactNode,
	useId,
	useRef,
	useState,
} from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { useIsMobile } from "@/components/character-sheet/view/number-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { showToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { visibleHpLabel } from "@/lib/vtt/character-hp";
import {
	bareNumberHint,
	canUndoHp,
	HP_UNDO_MS,
	type HpAction,
	type HpActionPlan,
	type HpValues,
	hpEnterAction,
	parseHpInput,
	planHpAction,
} from "@/lib/vtt/hp-quick";
import { WardShieldGlyph } from "./sheet-icons";

type Save = Promise<unknown> | unknown;

interface AppliedHp {
	plan: HpActionPlan;
	label: string;
	at: number;
}

interface FailedHp {
	action: HpAction | "undo";
	amount: number;
	label: string;
	before: number;
}

const STEPS = [-5, -1, 1, 5] as const;

/** Rótulo curto do ajuste: “−15”, “+8”, “= 15”. */
function signedLabel(action: HpAction, amount: number): string {
	if (action === "damage") return `−${amount}`;
	if (action === "heal") return `+${amount}`;
	return `= ${amount}`;
}

/** Uma gravação que devolve `false` (ex.: `onUpdateToken`) também é falha. */
async function saveOrThrow(save: () => Save) {
	const result = await save();
	if (result === false) throw new Error("hp-save-failed");
}

function Kbd({ children }: { children: ReactNode }) {
	// Mesmo estilo do Kbd da mesa (vtt-options-bar.tsx).
	return (
		<kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-foreground">
			{children}
		</kbd>
	);
}

function Step({
	label,
	from,
	to,
	tone,
}: {
	label: string;
	from: number;
	to: number;
	tone: string;
}) {
	return (
		<span className="inline-flex items-center gap-1 whitespace-nowrap">
			<span className="text-muted-foreground">{label}</span>
			<span className="text-muted-foreground tabular-nums">{from}</span>
			<ArrowRight aria-hidden className="size-3 text-muted-foreground" />
			<span className={cn("font-semibold tabular-nums", tone)}>{to}</span>
		</span>
	);
}

/** “Temp 5 → 0 · PV 27 → 17”, ou “Definir PV 27 → 15”. */
function HpPreview({
	plan,
	showMax,
}: {
	plan: HpActionPlan;
	showMax: boolean;
}) {
	if (plan.noop === "max") {
		return (
			<span className="text-muted-foreground">
				Já está no máximo{showMax ? ` (${plan.before.current})` : ""}. Nada a
				curar.
			</span>
		);
	}
	if (plan.noop === "zero") {
		return <span className="text-muted-foreground">Já está em 0 PV.</span>;
	}
	if (plan.noop === "same") {
		return (
			<span className="text-muted-foreground">
				Fica igual: PV {plan.before.current}.
			</span>
		);
	}
	const tone =
		plan.action === "damage"
			? "text-destructive"
			: plan.action === "heal"
				? "text-primary"
				: "text-foreground";
	return (
		<span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
			{plan.action === "set" ? (
				<span className="font-medium text-foreground">
					Definir {plan.amount} ·
				</span>
			) : null}
			{plan.after.temp !== plan.before.temp ? (
				<Step
					label="Temp"
					from={plan.before.temp}
					to={plan.after.temp}
					tone={tone}
				/>
			) : null}
			{plan.after.temp !== plan.before.temp &&
			plan.after.current !== plan.before.current ? (
				<span aria-hidden className="text-muted-foreground">
					·
				</span>
			) : null}
			{plan.after.current !== plan.before.current ? (
				<Step
					label="PV"
					from={plan.before.current}
					to={plan.after.current}
					tone={tone}
				/>
			) : null}
			{plan.after.current === 0 && plan.before.current > 0 ? (
				<span className="font-medium text-destructive">· cai a 0 PV</span>
			) : null}
			{plan.overflow > 0 ? (
				<span className="text-muted-foreground">
					· sobram {plan.overflow} de dano
				</span>
			) : null}
			{plan.before.current === 0 && plan.after.current > 0 ? (
				<span className="font-medium text-primary">· volta a ficar de pé</span>
			) : null}
		</span>
	);
}

/** Barra do painel: só tokens, sem gradiente nem brilho; o trecho que sai em destructive/70. */
function PanelBar({
	current,
	max,
	temp,
	ghost,
}: {
	current: number;
	max: number;
	temp: number;
	ghost: HpValues | null;
}) {
	const pct = (value: number) =>
		`${max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0}%`;
	const low = max > 0 && current / max <= 0.25;
	return (
		<div
			aria-hidden
			className="relative flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted p-0.5"
		>
			<div
				className="relative h-full rounded-full"
				style={{ width: pct(current) }}
			>
				<div
					className={cn(
						"absolute inset-0 rounded-full",
						low ? "bg-destructive" : "bg-primary",
					)}
				/>
				{ghost && ghost.current < current ? (
					<div
						className="absolute inset-y-0 right-0 rounded-r-full bg-destructive/70"
						style={{
							width: `${((current - ghost.current) / Math.max(1, current)) * 100}%`,
						}}
					/>
				) : null}
			</div>
			{ghost && ghost.current > current ? (
				<div
					className="h-full rounded-full bg-primary/45"
					style={{ width: pct(ghost.current - current) }}
				/>
			) : null}
			{temp > 0 ? (
				<div
					className={cn(
						"h-full rounded-full",
						ghost && ghost.temp < temp ? "bg-destructive/70" : "bg-primary/45",
					)}
					style={{ width: pct(temp) }}
				/>
			) : null}
		</div>
	);
}

/**
 * PV da ficha na mesa. Tocar no número abre o painel de PV (Popover no desktop,
 * BottomSheet no celular): −5/−1/+1/+5, um campo de valor com − Dano e + Curar,
 * e “Editar valores” (PV atual, máximo e temporária). No campo, “15” ou “=15”
 * define o PV, “−15” é dano e “+8” é cura; Enter aplica o que o texto diz e
 * Shift+Enter cura. Dano come a vida temporária primeiro só para quem pode
 * gravá-la (`onChangeTempHp`); cura não passa do máximo. Um ajuste por vez, e
 * cada um pode ser desfeito por 10 s se o PV ainda for o que ele deixou.
 */
export function SheetHp({
	current,
	max,
	showMax,
	temp = 0,
	name,
	onChange,
	onChangeMax,
	onChangeHp,
	onChangeTempHp,
}: {
	current: number;
	max: number;
	showMax: boolean;
	temp?: number;
	/** Nome no título do painel (“Pontos de vida · Elara”). */
	name?: string;
	onChange?: (next: number) => Save;
	onChangeMax?: (next: number) => Save;
	onChangeHp?: (patch: { current?: number; max?: number }) => Save;
	onChangeTempHp?: (next: number) => Save;
}) {
	const ids = useId();
	const isMobile = useIsMobile();
	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<"quick" | "edit">("quick");
	const [raw, setRaw] = useState("");
	const [saving, setSaving] = useState<HpAction | "step" | "undo" | null>(null);
	const [failed, setFailed] = useState<FailedHp | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [applied, setApplied] = useState<AppliedHp | null>(null);
	const [last, setLast] = useState<string | null>(null);
	const [currentDraft, setCurrentDraft] = useState<string | null>(null);
	const [maxDraft, setMaxDraft] = useState<string | null>(null);
	const [tempDraft, setTempDraft] = useState<string | null>(null);
	const pendingRef = useRef(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const appliedRef = useRef<AppliedHp | null>(null);
	// O desfazer do toast roda depois do painel fechar: lê sempre o PV de agora.
	const liveRef = useRef({ current, temp });
	liveRef.current = { current, temp };

	const canEditCurrent = Boolean(onChange || onChangeHp);
	const canEditMax = showMax && Boolean(onChangeMax || onChangeHp);
	const canTemp = Boolean(onChangeTempHp);
	const editable = canEditCurrent || canEditMax || canTemp;
	const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
	const low = max > 0 && current / max <= 0.25;
	const busy = saving !== null;
	const state = { current, max, temp, canTemp };

	const parsed = parseHpInput(raw);
	const invalid = parsed.kind === "invalid";
	const amount = parsed.amount;
	// O que Enter aplica: a regra do “15” sem sinal mora só em `hpEnterAction`.
	const enterAction = hpEnterAction(parsed);
	const hasAmount = enterAction !== null;
	const damagePlan =
		hasAmount && amount > 0 ? planHpAction("damage", amount, state) : null;
	const healPlan =
		hasAmount && amount > 0 ? planHpAction("heal", amount, state) : null;
	const setPlan =
		parsed.kind === "set" || parsed.kind === "bare"
			? planHpAction("set", amount, state)
			: null;
	const mainPlan =
		enterAction === "damage"
			? damagePlan
			: enterAction === "heal"
				? healPlan
				: enterAction === "set"
					? setPlan
					: null;

	const writeValues = async (to: HpValues, from: HpValues) => {
		if (onChangeTempHp && to.temp !== from.temp) {
			await saveOrThrow(() => onChangeTempHp(to.temp));
		}
		if (to.current !== from.current) {
			if (onChange) await saveOrThrow(() => onChange(to.current));
			else if (onChangeHp) {
				await saveOrThrow(() => onChangeHp({ current: to.current }));
			}
		}
	};

	const rememberApplied = (entry: AppliedHp | null) => {
		appliedRef.current = entry;
		setApplied(entry);
		if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
		undoTimerRef.current = entry
			? setTimeout(() => {
					if (appliedRef.current === entry) rememberApplied(null);
				}, HP_UNDO_MS)
			: null;
	};

	const run = (
		kind: HpAction | "step",
		plan: HpActionPlan,
		label: string,
		fromField: boolean,
	) => {
		if (pendingRef.current || plan.noop || !canEditCurrent) return;
		pendingRef.current = true;
		setSaving(kind);
		setFailed(null);
		setNotice(null);
		void writeValues(plan.after, plan.before)
			.then(() => {
				rememberApplied({ plan, label, at: Date.now() });
				setLast(label);
				if (fromField) setRaw("");
			})
			.catch(() => {
				setFailed({
					action: plan.action,
					amount: plan.amount,
					label,
					before: plan.before.current,
				});
			})
			.finally(() => {
				pendingRef.current = false;
				setSaving(null);
			});
	};

	const applyAction = (action: HpAction, value: number, fromField = true) => {
		run(
			action,
			planHpAction(action, value, state),
			signedLabel(action, value),
			fromField,
		);
	};

	const undo = () => {
		const entry = appliedRef.current;
		if (!entry || pendingRef.current) return;
		if (!canUndoHp(entry.plan, liveRef.current, Date.now() - entry.at)) {
			rememberApplied(null);
			setNotice("O PV mudou depois; nada foi desfeito.");
			showToast("info", {
				title: "Nada foi desfeito",
				description: "O PV mudou depois do ajuste.",
				noBlur: true,
			});
			return;
		}
		pendingRef.current = true;
		setSaving("undo");
		setFailed(null);
		setNotice(null);
		void writeValues(entry.plan.before, entry.plan.after)
			.then(() => {
				rememberApplied(null);
				setLast(`${entry.label} desfeito`);
			})
			.catch(() => {
				setFailed({
					action: "undo",
					amount: entry.plan.amount,
					label: entry.label,
					before: entry.plan.after.current,
				});
			})
			.finally(() => {
				pendingRef.current = false;
				setSaving(null);
			});
	};
	const undoRef = useRef(undo);
	undoRef.current = undo;

	const retry = () => {
		if (!failed) return;
		if (failed.action === "undo") undo();
		else applyAction(failed.action, failed.amount, true);
	};

	const resetDrafts = () => {
		setCurrentDraft(null);
		setMaxDraft(null);
		setTempDraft(null);
	};

	const changeOpen = (next: boolean) => {
		setOpen(next);
		if (next) return;
		setMode("quick");
		setRaw("");
		setFailed(null);
		setNotice(null);
		resetDrafts();
		// Fechou com o desfazer ainda valendo: ele segue no toast até o fim da janela.
		const entry = appliedRef.current;
		const left = entry ? HP_UNDO_MS - (Date.now() - entry.at) : 0;
		if (entry && left > 500) {
			showToast("info", {
				title: `${entry.label} aplicado`,
				description: `PV ${entry.plan.before.current} → ${entry.plan.after.current}`,
				action: { label: "Desfazer", onClick: () => undoRef.current() },
				durationMs: left,
				noBlur: true,
			});
		}
	};

	const onFieldKey = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
		event.preventDefault();
		if (busy) return;
		const action = hpEnterAction(parsed, event.shiftKey);
		if (action) applyAction(action, amount);
	};

	const applyEdit = () => {
		if (pendingRef.current) return;
		pendingRef.current = true;
		setSaving("set");
		const work = async () => {
			const nextCurrent = Number.parseInt(currentDraft ?? String(current), 10);
			const nextMax = canEditMax
				? Number.parseInt(maxDraft ?? String(max), 10)
				: null;
			const hasCurrent =
				canEditCurrent &&
				Number.isFinite(nextCurrent) &&
				nextCurrent >= 0 &&
				nextCurrent !== current;
			const hasMax =
				nextMax !== null &&
				Number.isFinite(nextMax) &&
				nextMax > 0 &&
				nextMax !== max;
			if (onChangeHp && (hasCurrent || hasMax)) {
				await onChangeHp({
					current: hasCurrent ? nextCurrent : undefined,
					max: hasMax ? (nextMax ?? undefined) : undefined,
				});
			} else {
				if (hasCurrent && onChange) await onChange(nextCurrent);
				if (hasMax && onChangeMax && nextMax !== null) {
					await onChangeMax(nextMax);
				}
			}
			if (onChangeTempHp && tempDraft !== null) {
				const nextTemp = Number.parseInt(tempDraft || "0", 10);
				if (Number.isFinite(nextTemp) && nextTemp >= 0 && nextTemp !== temp) {
					await onChangeTempHp(nextTemp);
				}
			}
		};
		void work()
			.catch(() => undefined)
			.finally(() => {
				pendingRef.current = false;
				setSaving(null);
			});
		changeOpen(false);
	};

	const numberClass =
		"font-display text-[2rem] leading-none font-semibold tabular-nums";
	const slotInputClass =
		"h-11 border-0 bg-transparent px-2.5 pt-4 pb-0.5 font-mono text-[16px] md:text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
	const previewId = `${ids}-preview`;
	const title = name ? `Pontos de vida · ${name}` : "Pontos de vida";

	const editForm = (
		<form
			className="space-y-2.5"
			onSubmit={(event) => {
				event.preventDefault();
				applyEdit();
			}}
		>
			{canEditCurrent || canEditMax ? (
				<div
					className={cn(
						"grid divide-x divide-border overflow-hidden rounded-lg border border-border bg-muted/40 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15",
						canEditCurrent && canEditMax ? "grid-cols-2" : "grid-cols-1",
					)}
				>
					{canEditCurrent ? (
						<div className="relative min-w-0">
							<label
								htmlFor={`${ids}-current`}
								className="pointer-events-none absolute top-1 left-2.5 text-[10px] font-medium text-muted-foreground"
							>
								PV atual
							</label>
							<Input
								id={`${ids}-current`}
								type="number"
								min={0}
								inputMode="numeric"
								spellCheck={false}
								autoComplete="off"
								disabled={busy}
								aria-label="PV atual"
								value={currentDraft ?? String(current)}
								onChange={(event) => setCurrentDraft(event.target.value)}
								className={slotInputClass}
							/>
						</div>
					) : null}
					{canEditMax ? (
						<div className="relative min-w-0">
							<label
								htmlFor={`${ids}-max`}
								className="pointer-events-none absolute top-1 left-2.5 text-[10px] font-medium text-muted-foreground"
							>
								PV máximo
							</label>
							<Input
								id={`${ids}-max`}
								type="number"
								min={1}
								inputMode="numeric"
								spellCheck={false}
								autoComplete="off"
								disabled={busy}
								aria-label="PV máximo"
								value={maxDraft ?? String(max)}
								onChange={(event) => setMaxDraft(event.target.value)}
								className={slotInputClass}
							/>
						</div>
					) : null}
				</div>
			) : null}
			{onChangeTempHp ? (
				<div className="flex items-stretch divide-x divide-border overflow-hidden rounded-lg border border-border bg-muted/40 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
					<div className="relative min-w-0 flex-1">
						<label
							htmlFor={`${ids}-temp`}
							className="pointer-events-none absolute top-1 left-2.5 text-[10px] font-medium text-muted-foreground"
						>
							Vida temporária
						</label>
						<Input
							id={`${ids}-temp`}
							type="number"
							min={0}
							inputMode="numeric"
							spellCheck={false}
							autoComplete="off"
							disabled={busy}
							aria-label="Vida temporária"
							placeholder="0"
							value={tempDraft ?? (temp > 0 ? String(temp) : "")}
							onChange={(event) => setTempDraft(event.target.value)}
							className={slotInputClass}
						/>
					</div>
					{temp > 0 ? (
						<Button
							type="button"
							variant="ghost"
							disabled={busy}
							className="h-11 min-h-11 shrink-0 rounded-none border-0 px-2.5 text-xs font-medium text-muted-foreground hover:bg-destructive/12 hover:text-destructive focus-visible:z-10"
							onClick={() => setTempDraft("0")}
						>
							Zerar
						</Button>
					) : null}
				</div>
			) : null}
			<div className="flex gap-2">
				<Button
					type="button"
					variant="ghost"
					size="touch"
					className="text-muted-foreground"
					onClick={() => {
						resetDrafts();
						setMode("quick");
					}}
				>
					Voltar
				</Button>
				<Button
					type="submit"
					variant="outline"
					size="touch"
					disabled={busy}
					className="flex-1"
				>
					Aplicar
				</Button>
			</div>
		</form>
	);

	const quickBody = (
		<div className="space-y-3">
			<div className="flex items-baseline gap-1.5">
				<span
					className={cn(
						numberClass,
						low ? "text-destructive" : "text-foreground",
					)}
				>
					{current}
				</span>
				{showMax ? (
					<span className="font-mono text-sm text-muted-foreground tabular-nums">
						/ {max}
					</span>
				) : null}
				{temp > 0 ? (
					<span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-primary tabular-nums">
						<Shield aria-hidden className="size-3" />+{temp} temp
					</span>
				) : null}
				{busy ? (
					<output className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
						<Loader2
							aria-hidden
							className="size-4 animate-spin motion-reduce:animate-none"
						/>
						Salvando…
					</output>
				) : null}
			</div>
			<PanelBar
				current={current}
				max={max}
				temp={temp}
				ghost={mainPlan && !mainPlan.noop ? mainPlan.after : null}
			/>
			{canEditCurrent ? (
				<div className="grid grid-cols-4 divide-x divide-border overflow-hidden rounded-lg border border-border">
					{STEPS.map((step) => {
						const plan = planHpAction(
							step < 0 ? "damage" : "heal",
							Math.abs(step),
							state,
						);
						return (
							<button
								key={step}
								type="button"
								disabled={busy || Boolean(plan.noop)}
								aria-label={`${step > 0 ? "Curar" : "Tirar"} ${Math.abs(step)} PV`}
								onClick={() =>
									run(
										"step",
										plan,
										signedLabel(plan.action, plan.amount),
										false,
									)
								}
								className={cn(
									"min-h-11 cursor-pointer select-none font-mono text-sm font-medium tabular-nums transition-colors duration-150 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
									step < 0
										? "text-destructive [@media(hover:hover)]:hover:bg-destructive/15"
										: "text-primary [@media(hover:hover)]:hover:bg-primary/15",
								)}
							>
								{step > 0 ? `+${step}` : `−${Math.abs(step)}`}
							</button>
						);
					})}
				</div>
			) : null}
			{canEditCurrent ? (
				<div className="border-t border-border pt-3">
					<label
						htmlFor={`${ids}-value`}
						className="text-xs font-medium text-muted-foreground"
					>
						Dano, cura ou novo valor
					</label>
					<Input
						id={`${ids}-value`}
						ref={inputRef}
						value={raw}
						onChange={(event) => {
							setRaw(event.target.value);
							setNotice(null);
						}}
						onKeyDown={onFieldKey}
						inputMode={isMobile ? "numeric" : "text"}
						enterKeyHint="done"
						autoComplete="off"
						spellCheck={false}
						readOnly={busy}
						aria-busy={busy || undefined}
						aria-invalid={invalid || undefined}
						aria-describedby={previewId}
						placeholder="0"
						className={cn(
							"mt-1.5 h-[52px] text-center font-display text-[28px] font-semibold tabular-nums md:text-[28px]",
							parsed.kind === "damage" && "text-destructive",
							parsed.kind === "heal" && "text-primary",
						)}
					/>
					<div
						id={previewId}
						aria-live="polite"
						className="mt-1.5 flex min-h-9 items-center text-xs"
					>
						{invalid ? (
							<span className="text-destructive">
								Só número: 15, −15 ou +8. “{raw.trim()}” não vale.
							</span>
						) : parsed.kind === "zero" ? (
							<span className="text-muted-foreground">0 não muda nada.</span>
						) : mainPlan ? (
							<HpPreview plan={mainPlan} showMax={showMax} />
						) : (
							<span className="text-muted-foreground">
								{isMobile ? (
									"Digite o valor e toque em Dano, Curar ou Definir."
								) : (
									<>
										<Kbd>↵</Kbd> aplica · <Kbd>Shift ↵</Kbd> cura ·{" "}
										{bareNumberHint()}
									</>
								)}
							</span>
						)}
					</div>
					{!canTemp && temp > 0 ? (
						<p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
							<Shield aria-hidden className="mt-0.5 size-3.5 shrink-0" />
							<span>
								A vida temporária (+{temp}) só o mestre muda. O dano daqui vai
								direto no PV.
							</span>
						</p>
					) : null}
					<div className="mt-1.5 flex gap-2">
						<Button
							type="button"
							variant="destructive"
							size="touch"
							disabled={busy || !damagePlan || Boolean(damagePlan.noop)}
							loading={saving === "damage"}
							aria-label={
								damagePlan && !damagePlan.noop
									? `Aplicar ${amount} de dano`
									: "Dano"
							}
							onClick={() => applyAction("damage", amount)}
							className={cn(
								"flex-1 justify-between",
								enterAction === "damage" && "ring-2 ring-destructive/40",
							)}
						>
							<span className="inline-flex items-center gap-1.5">
								<Minus aria-hidden /> Dano
							</span>
							{damagePlan && !damagePlan.noop ? (
								<span className="font-mono text-xs tabular-nums opacity-90">
									→ {damagePlan.after.current}
								</span>
							) : null}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="touch"
							disabled={busy || !healPlan || Boolean(healPlan.noop)}
							loading={saving === "heal"}
							aria-label={
								healPlan && !healPlan.noop ? `Curar ${amount}` : "Curar"
							}
							onClick={() => applyAction("heal", amount)}
							className={cn(
								"flex-1 justify-between text-primary hover:text-primary",
								enterAction === "heal" && "border-primary/40 bg-primary/10",
							)}
						>
							<span className="inline-flex items-center gap-1.5">
								<Plus aria-hidden /> Curar
							</span>
							{healPlan && !healPlan.noop ? (
								<span className="font-mono text-xs tabular-nums opacity-90">
									→ {healPlan.after.current}
								</span>
							) : null}
						</Button>
					</div>
					{isMobile && setPlan ? (
						<Button
							type="button"
							variant="outline"
							size="touch"
							disabled={busy || Boolean(setPlan.noop)}
							aria-label={`Definir PV em ${setPlan.after.current}`}
							onClick={() => applyAction("set", amount)}
							className="mt-2 w-full justify-between"
						>
							<span>Definir</span>
							<span className="font-mono text-xs tabular-nums opacity-90">
								→ {setPlan.after.current}
							</span>
						</Button>
					) : null}
				</div>
			) : null}
			<div className="border-t border-border pt-1">
				{failed ? (
					<div
						role="alert"
						className="flex min-h-11 items-center gap-2 text-xs"
					>
						<WifiOff aria-hidden className="size-4 shrink-0 text-destructive" />
						<span className="min-w-0 flex-1 text-foreground">
							{failed.action === "undo"
								? "Não deu para desfazer. Confira a conexão."
								: `Não foi salvo. O ${failed.label} não entrou e o PV continua em ${failed.before}.`}
						</span>
						<Button
							type="button"
							variant="outline"
							size="touch"
							disabled={busy}
							onClick={retry}
							className="-mr-1 shrink-0"
						>
							Tentar de novo
						</Button>
					</div>
				) : applied ? (
					<div className="flex min-h-11 items-center gap-2 text-xs">
						<output className="min-w-0 flex-1">
							<span
								className={cn(
									"font-semibold tabular-nums",
									applied.plan.action === "damage"
										? "text-destructive"
										: applied.plan.action === "heal"
											? "text-primary"
											: "text-foreground",
								)}
							>
								{applied.label}
							</span>{" "}
							<span className="text-muted-foreground">
								aplicado · PV {applied.plan.before.current} →{" "}
								{applied.plan.after.current}
								{applied.plan.after.temp !== applied.plan.before.temp
									? ` · Temp ${applied.plan.before.temp} → ${applied.plan.after.temp}`
									: ""}
							</span>
						</output>
						<Button
							type="button"
							variant="ghost"
							size="touch"
							disabled={busy}
							loading={saving === "undo"}
							onClick={undo}
							className="-mr-2 shrink-0 text-primary hover:text-primary"
						>
							<Undo2 data-icon="inline-start" /> Desfazer
						</Button>
					</div>
				) : (
					<div className="flex min-h-11 items-center justify-between gap-2">
						<p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
							{notice ? (
								<output>{notice}</output>
							) : last ? (
								<>
									<History aria-hidden className="size-3.5 shrink-0" /> Último:{" "}
									{last}
								</>
							) : null}
						</p>
						<Button
							type="button"
							variant="ghost"
							size="touch"
							disabled={busy}
							onClick={() => setMode("edit")}
							className="-mr-2 shrink-0 text-muted-foreground"
						>
							<SlidersHorizontal data-icon="inline-start" /> Editar valores
						</Button>
					</div>
				)}
			</div>
		</div>
	);

	const panel = mode === "edit" ? editForm : quickBody;
	const animatedNumber = (
		<span
			key={current}
			className="inline-block animate-[t-digit-pop-in_320ms_cubic-bezier(0.34,1.45,0.64,1)_both] motion-reduce:animate-none"
		>
			{current}
		</span>
	);
	const triggerLabel = `Pontos de vida: ${visibleHpLabel(current, max, showMax)}. Abrir dano e cura`;
	const triggerClass = cn(
		numberClass,
		"-mx-1.5 inline-flex min-h-9 cursor-pointer [@media(pointer:coarse)]:min-h-11 select-none items-center justify-center rounded-lg px-1.5 underline decoration-dotted decoration-1 decoration-muted-foreground/40 underline-offset-[4px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:hover:bg-white/[0.05] [@media(hover:hover)]:hover:decoration-muted-foreground/70",
		low ? "text-destructive" : "text-foreground",
	);

	return (
		<section
			aria-label="Pontos de vida"
			aria-busy={busy}
			className="relative rounded-xl border border-white/[0.07] bg-linear-to-b from-white/[0.025] to-black/25 p-3 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]"
		>
			<output
				data-testid="vtt-hp-saving"
				aria-hidden={busy ? undefined : true}
				className={cn(
					"pointer-events-none absolute top-2.5 right-3 text-[11px] text-muted-foreground transition-opacity duration-150",
					busy && !open ? "opacity-100" : "opacity-0",
				)}
			>
				Salvando…
			</output>
			<div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
				{!editable ? (
					<span className={cn(numberClass, "text-foreground")}>
						{animatedNumber}
					</span>
				) : isMobile ? (
					<button
						type="button"
						aria-haspopup="dialog"
						aria-expanded={open}
						aria-label={triggerLabel}
						onClick={() => changeOpen(true)}
						className={triggerClass}
					>
						{animatedNumber}
					</button>
				) : (
					<Popover open={open} onOpenChange={changeOpen}>
						<PopoverTrigger
							render={
								<button
									type="button"
									aria-label={triggerLabel}
									className={triggerClass}
								/>
							}
						>
							{animatedNumber}
						</PopoverTrigger>
						<PopoverContent
							align="start"
							side="bottom"
							sideOffset={8}
							initialFocus={inputRef}
							data-vtt-focus-scope="sheet"
							className="w-[356px] gap-0 rounded-xl border-border bg-popover md:bg-popover md:backdrop-blur-none"
						>
							<p className="mb-2 text-sm font-semibold text-foreground">
								{title}
							</p>
							{panel}
						</PopoverContent>
					</Popover>
				)}
				{showMax ? (
					<span className="font-mono text-sm text-muted-foreground tabular-nums">
						/ {max}
					</span>
				) : null}
				{temp > 0 ? (
					<span className="ml-1 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/12 px-1.5 py-0.5 font-mono text-[11px] font-medium text-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.08)] tabular-nums">
						<WardShieldGlyph className="size-3" />+{temp} temp
					</span>
				) : null}
				{editable ? (
					<span className="ml-auto self-center text-xs text-muted-foreground">
						{isMobile ? "toque no PV" : "clique no PV"}
					</span>
				) : null}
			</div>

			<div className="relative mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-black/45 p-0.5 ring-1 ring-inset ring-white/[0.07]">
				<div
					data-testid="vtt-hp-bar"
					className={cn(
						"h-full rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
						low
							? "bg-destructive"
							: "bg-primary bg-linear-to-r from-primary-dark via-primary to-[oklch(0.74_0.19_295)] shadow-[0_0_10px_var(--primary-glow)]",
					)}
					style={{ width: `${ratio * 100}%` }}
				/>
				{temp > 0 && max > 0 ? (
					<div
						data-testid="vtt-temp-hp-bar"
						className="h-full rounded-full bg-primary/45 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
						style={{ width: `${Math.min(100, (temp / max) * 100)}%` }}
					/>
				) : null}
				<span
					aria-hidden
					className="pointer-events-none absolute inset-y-0 left-1/4 w-px bg-black/40"
				/>
				<span
					aria-hidden
					className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-black/40"
				/>
				<span
					aria-hidden
					className="pointer-events-none absolute inset-y-0 left-3/4 w-px bg-black/40"
				/>
			</div>
			{last && !open ? (
				<p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
					<History aria-hidden className="size-3.5" /> Último: {last}
				</p>
			) : null}

			{isMobile && editable ? (
				<BottomSheet
					open={open}
					onOpenChange={changeOpen}
					title={title}
					className="backdrop-blur-none"
					overlayClassName="bg-black/60 backdrop-blur-none"
					data-vtt-focus-scope="sheet"
				>
					<div className="pb-2">{panel}</div>
				</BottomSheet>
			) : null}
		</section>
	);
}
