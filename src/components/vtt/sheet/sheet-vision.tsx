import { Pencil } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatSpeed, speedUnitOf } from "@/core/rules";
import { normalizeVision, visionDraftError } from "@/lib/character-vision";
import type { Character } from "@/lib/store";
import type { SystemConfig } from "@/lib/systems";
import { ArcaneEyeGlyph } from "./sheet-icons";
import type { SheetResourceApi } from "./use-sheet-resources";

/** Valor da visão como a mesa mostra: na unidade da cena, ou "—" sem valor. */
function shown(
	value: number | undefined,
	sheetUnit: string,
	sceneUnit: string | null | undefined,
): string {
	return value && value > 0 ? formatSpeed(value, sheetUnit, sceneUnit) : "—";
}

/**
 * Visão do personagem: quanto enxerga na luz e no escuro (é o que revela o mapa
 * no modo Exploração). Todos veem; quem pode editar (mestre, co-mestre e o
 * criador da ficha) abre um formulário curto. O que se digita fica na unidade
 * do deslocamento da ficha.
 */
export function VisionSection({
	character,
	config,
	sceneUnit,
	resources,
}: {
	character: Character;
	config: SystemConfig;
	sceneUnit?: string | null;
	resources: SheetResourceApi;
}) {
	const sheetUnit = speedUnitOf(character, config.speedUnit);
	const light = character.visionDistance;
	const dark = character.darkvisionDistance;
	const [editing, setEditing] = useState(false);
	const [lightText, setLightText] = useState("");
	const [darkText, setDarkText] = useState("");
	const lightId = useId();
	const darkId = useId();

	const hasValue = Boolean(light && light > 0) || Boolean(dark && dark > 0);
	if (!hasValue && !resources.canEdit) return null;

	const lightError = visionDraftError(lightText);
	const darkError = visionDraftError(darkText);

	const open = () => {
		setLightText(light ? String(light) : "");
		setDarkText(dark ? String(dark) : "");
		setEditing(true);
	};

	const submit = (event: React.FormEvent) => {
		event.preventDefault();
		if (lightError || darkError) return;
		resources.saveVision({
			visionDistance: normalizeVision(lightText),
			darkvisionDistance: normalizeVision(darkText),
		});
		setEditing(false);
	};

	const numberInputClass =
		"h-7 border-0 bg-transparent px-2.5 pb-1.5 pt-0 font-mono text-[16px] md:text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

	if (editing) {
		return (
			<form
				aria-label="Editar visão"
				onSubmit={submit}
				onKeyDown={(event) => {
					if (event.key === "Escape") setEditing(false);
				}}
				className="space-y-3 rounded-xl border border-border/60 bg-background/35 p-3 shadow-2xs"
			>
				<div className="grid grid-cols-2 divide-x divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-background/40 transition-colors focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/15">
					<div className="min-w-0">
						<label
							htmlFor={lightId}
							className="block px-2.5 pt-1.5 text-[10.5px] font-medium text-muted-foreground"
						>
							Na luz ({sheetUnit})
						</label>
						<Input
							id={lightId}
							type="number"
							inputMode="decimal"
							min={0}
							step="any"
							autoComplete="off"
							spellCheck={false}
							placeholder="6 casas"
							value={lightText}
							aria-invalid={lightError ? true : undefined}
							onChange={(event) => setLightText(event.target.value)}
							className={numberInputClass}
						/>
						{lightError ? (
							<p
								role="alert"
								className="px-2.5 pb-1.5 text-[11px] text-destructive"
							>
								{lightError}
							</p>
						) : null}
					</div>
					<div className="min-w-0">
						<label
							htmlFor={darkId}
							className="block px-2.5 pt-1.5 text-[10.5px] font-medium text-muted-foreground"
						>
							No escuro ({sheetUnit})
						</label>
						<Input
							id={darkId}
							type="number"
							inputMode="decimal"
							min={0}
							step="any"
							autoComplete="off"
							spellCheck={false}
							placeholder="1 casa"
							value={darkText}
							aria-invalid={darkError ? true : undefined}
							onChange={(event) => setDarkText(event.target.value)}
							className={numberInputClass}
						/>
						{darkError ? (
							<p
								role="alert"
								className="px-2.5 pb-1.5 text-[11px] text-destructive"
							>
								{darkError}
							</p>
						) : null}
					</div>
				</div>
				<p className="text-[11px] text-muted-foreground">
					Numa cena escura só vale a visão no escuro. Vazio: 6 casas na luz e 1
					casa no escuro.
				</p>
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="ghost"
						className="h-9 min-h-9 rounded-lg text-xs font-medium text-muted-foreground [@media(pointer:coarse)]:min-h-11"
						onClick={() => setEditing(false)}
					>
						Cancelar
					</Button>
					<Button
						type="submit"
						variant="outline"
						disabled={Boolean(lightError || darkError)}
						className="h-9 min-h-9 rounded-lg border-primary/35 bg-primary/10 text-xs font-medium text-primary hover:bg-primary/15 [@media(pointer:coarse)]:min-h-11"
					>
						Salvar
					</Button>
				</div>
			</form>
		);
	}

	return (
		<section
			aria-label="Visão"
			className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-linear-to-b from-white/[0.025] to-black/25 px-3 py-2 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]"
		>
			<div className="flex min-w-0 items-center gap-2.5 text-sm">
				<ArcaneEyeGlyph className="size-4 shrink-0 text-primary/80" />
				<dl className="flex min-w-0 flex-wrap items-center gap-2">
					<div className="flex items-baseline gap-1.5 rounded-lg bg-black/25 px-2.5 py-1 ring-1 ring-white/[0.06]">
						<dt className="text-[11px] text-muted-foreground">Na luz</dt>
						<dd className="font-mono text-xs font-semibold text-foreground tabular-nums">
							{shown(light, sheetUnit, sceneUnit)}
						</dd>
					</div>
					<div className="flex items-baseline gap-1.5 rounded-lg bg-black/25 px-2.5 py-1 ring-1 ring-white/[0.06]">
						<dt className="text-[11px] text-muted-foreground">No escuro</dt>
						<dd className="font-mono text-xs font-semibold text-foreground tabular-nums">
							{shown(dark, sheetUnit, sceneUnit)}
						</dd>
					</div>
				</dl>
			</div>
			{resources.canEdit ? (
				<button
					type="button"
					onClick={open}
					aria-label="Editar visão"
					className="group flex min-h-8 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-[background-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:hover:bg-white/[0.05] [@media(hover:hover)]:hover:text-foreground [@media(pointer:coarse)]:min-h-11"
				>
					<Pencil aria-hidden className="t-icon-spring size-3" />
					Editar
				</button>
			) : null}
		</section>
	);
}
