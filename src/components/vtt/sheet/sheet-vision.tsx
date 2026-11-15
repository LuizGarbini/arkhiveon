import { Eye, Pencil } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatSpeed, speedUnitOf } from "@/core/rules";
import { normalizeVision, visionDraftError } from "@/lib/character-vision";
import type { Character } from "@/lib/store";
import type { SystemConfig } from "@/lib/systems";
import type { SheetResourceApi } from "./use-sheet-resources";

const fieldLabel = "text-xs font-medium text-muted-foreground";

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

	if (editing) {
		return (
			<form
				aria-label="Editar visão"
				onSubmit={submit}
				onKeyDown={(event) => {
					if (event.key === "Escape") setEditing(false);
				}}
				className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3"
			>
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1">
						<label htmlFor={lightId} className={fieldLabel}>
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
							className="h-10 tabular-nums [@media(pointer:coarse)]:h-11"
						/>
						{lightError ? (
							<p role="alert" className="text-[11px] text-destructive">
								{lightError}
							</p>
						) : null}
					</div>
					<div className="space-y-1">
						<label htmlFor={darkId} className={fieldLabel}>
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
							className="h-10 tabular-nums [@media(pointer:coarse)]:h-11"
						/>
						{darkError ? (
							<p role="alert" className="text-[11px] text-destructive">
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
						variant="outline"
						className="min-h-10 [@media(pointer:coarse)]:min-h-11"
						onClick={() => setEditing(false)}
					>
						Cancelar
					</Button>
					<Button
						type="submit"
						disabled={Boolean(lightError || darkError)}
						className="min-h-10 [@media(pointer:coarse)]:min-h-11"
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
			className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2"
		>
			<div className="flex min-w-0 items-center gap-3 text-sm">
				<Eye aria-hidden className="size-4 shrink-0 text-muted-foreground" />
				<dl className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-0.5">
					<div className="flex items-baseline gap-1.5">
						<dt className="text-xs text-muted-foreground">Na luz</dt>
						<dd className="font-semibold tabular-nums">
							{shown(light, sheetUnit, sceneUnit)}
						</dd>
					</div>
					<div className="flex items-baseline gap-1.5">
						<dt className="text-xs text-muted-foreground">No escuro</dt>
						<dd className="font-semibold tabular-nums">
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
					className="flex min-h-9 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-[background-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:hover:bg-muted/50 [@media(hover:hover)]:hover:text-foreground [@media(pointer:coarse)]:min-h-11"
				>
					<Pencil aria-hidden className="size-3.5" />
					Editar
				</button>
			) : null}
		</section>
	);
}
