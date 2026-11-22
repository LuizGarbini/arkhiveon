import { type HpDeltaState, planHpDelta, planHpSet } from "./hp-delta";

/**
 * Painel de PV da ficha na mesa (dano rápido): leitura do que foi digitado,
 * conta do resultado e regra do desfazer. Tudo puro; quem chama grava.
 */

/**
 * O que foi digitado, sem decidir nada: `bare` é o número sem sinal (“15”), cuja
 * ação sai de `hpEnterAction`; `set` é só o “=15” explícito.
 */
export type HpInputKind =
	| "empty"
	| "invalid"
	| "zero"
	| "damage"
	| "heal"
	| "set"
	| "bare";

export interface HpInput {
	kind: HpInputKind;
	amount: number;
}

/** Até 4 dígitos, como na ficha. */
const HP_INPUT_RE = /^([+\-=]?)(\d{1,4})$/;

/**
 * “-15”, “−15”, “– 15” = dano; “+8” = cura; “=15” = definir; “15” = sem sinal
 * (`bare`). “0”, “+0” e “-0” não fazem nada; “=0” define 0. Qualquer outra coisa
 * é inválida.
 */
export function parseHpInput(raw: string): HpInput {
	const text = raw.replace(/[−–—]/g, "-").replace(/\s+/g, "");
	if (!text) return { kind: "empty", amount: 0 };
	const match = HP_INPUT_RE.exec(text);
	if (!match) return { kind: "invalid", amount: 0 };
	const sign = match[1];
	const amount = Number(match[2]);
	if (sign === "=") return { kind: "set", amount };
	if (amount === 0) return { kind: "zero", amount: 0 };
	if (sign === "-") return { kind: "damage", amount };
	if (sign === "+") return { kind: "heal", amount };
	return { kind: "bare", amount };
}

export type HpAction = "damage" | "heal" | "set";

/**
 * A ÚNICA regra do número sem sinal (“15” + Enter), ainda em aberto com o Luiz:
 * hoje define o PV (plano aprovado); se virar dano, troca só esta constante e os
 * testes dela. Prévia, destaque dos botões e dica do campo derivam daqui.
 */
export const BARE_NUMBER_ACTION: HpAction = "set";

/**
 * O que Enter aplica para o texto digitado (e o que a prévia mostra). Shift+Enter
 * sempre cura pelo valor. Sem valor aplicável, `null`.
 */
export function hpEnterAction(
	input: HpInput,
	shiftKey = false,
): HpAction | null {
	if (
		input.kind !== "damage" &&
		input.kind !== "heal" &&
		input.kind !== "set" &&
		input.kind !== "bare"
	) {
		return null;
	}
	// Sinal digitado manda (“−15” é sempre dano, “=15” define, “+8” cura);
	// Shift+Enter só decide o número sem sinal: cura.
	if (input.kind !== "bare") return input.kind;
	if (shiftKey) return input.amount > 0 ? "heal" : null;
	return BARE_NUMBER_ACTION;
}

/** Dica do campo: o que “15” sem sinal faz, na mesma regra de `hpEnterAction`. */
export function bareNumberHint(): string {
	return BARE_NUMBER_ACTION === "set"
		? "“15” define"
		: BARE_NUMBER_ACTION === "damage"
			? "“15” é dano"
			: "“15” cura";
}

/**
 * Número de destino nas prévias e rótulos (“→ 32”). `showMax` é a mesma regra
 * da ficha e do token (`useSheetHp`: ficha sem vínculo ou mestre/co-mestre).
 * Quem não vê o máximo daquela ficha lê “máx” quando o ajuste chega nele,
 * para a prévia não entregar o valor.
 */
export function hpTargetLabel(
	after: number,
	max: number,
	showMax: boolean,
): string {
	if (!showMax && max > 0 && after >= max) return "máx";
	return String(after);
}

export interface HpValues {
	current: number;
	temp: number;
}

export interface HpActionPlan {
	action: HpAction;
	amount: number;
	before: HpValues;
	after: HpValues;
	/** Dano que sobrou depois de zerar temp e PV. */
	overflow: number;
	/** Por que não muda nada: já no máximo, já em 0 ou valor igual. */
	noop: null | "max" | "zero" | "same";
}

/** Resultado de um dano, cura ou definir, com a regra de `planHpDelta`/`planHpSet`. */
export function planHpAction(
	action: HpAction,
	amount: number,
	state: HpDeltaState,
): HpActionPlan {
	const before = { current: state.current, temp: state.temp };
	const usableTemp = state.canTemp ? state.temp : 0;
	const plan =
		action === "set"
			? planHpSet(amount, state)
			: planHpDelta(action === "damage" ? -amount : amount, state);
	const after = {
		current: plan.current ?? state.current,
		temp: plan.temp ?? state.temp,
	};
	const overflow =
		action === "damage" ? Math.max(0, amount - usableTemp - state.current) : 0;
	const noop =
		action === "heal" && state.max > 0 && state.current >= state.max
			? "max"
			: action === "damage" && state.current === 0 && usableTemp === 0
				? "zero"
				: after.current === before.current && after.temp === before.temp
					? "same"
					: null;
	return { action, amount, before, after, overflow, noop };
}

/** Janela do desfazer. */
export const HP_UNDO_MS = 10_000;

/**
 * O desfazer só vale dentro da janela e se o PV (e a temporária) ainda forem os
 * que este ajuste deixou; se alguém mudou depois, não desfaz.
 */
export function canUndoHp(
	applied: Pick<HpActionPlan, "after">,
	now: HpValues,
	elapsedMs: number,
): boolean {
	if (!(elapsedMs >= 0) || elapsedMs > HP_UNDO_MS) return false;
	return (
		now.current === applied.after.current && now.temp === applied.after.temp
	);
}
