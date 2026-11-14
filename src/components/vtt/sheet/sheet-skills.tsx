import { Search } from "lucide-react";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { DND5E_SKILLS } from "@/components/character-sheet/fields/skills-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	calculateProficiencyBonus,
	calculateSkillModifier,
	type EffectiveStats,
	formatModifier,
} from "@/core/rules";
import type { Character } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { SheetRolls } from "./sheet-types";

function normalize(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

/**
 * Perícias do D&D 5e com os atributos dos itens equipados. Tocar numa linha
 * rola d20 + modificador e manda para o chat da mesa.
 */
export function SkillsTab({
	character,
	stats,
	rolls,
}: {
	character: Character;
	stats: EffectiveStats;
	rolls: SheetRolls;
}) {
	const searchId = useId();
	const [query, setQuery] = useState("");
	const deferred = useDeferredValue(query);
	const [onlyProficient, setOnlyProficient] = useState(false);
	const proficiency =
		character.proficiencyBonus ||
		calculateProficiencyBonus(character.level || 1);

	const rows = useMemo(() => {
		const q = normalize(deferred.trim());
		return DND5E_SKILLS.map((skill) => {
			const level = character.skillProficiencies?.[skill.id] ?? "none";
			return {
				...skill,
				level,
				modifier: calculateSkillModifier({
					attributeScore: stats.scores[skill.attributeKey],
					proficiencyBonus: proficiency,
					proficiencyLevel: level,
				}),
			};
		}).filter(
			(row) =>
				(!onlyProficient || row.level !== "none") &&
				(!q ||
					normalize(row.name).includes(q) ||
					normalize(row.attributeName).includes(q) ||
					normalize(row.attributeShort).includes(q)),
		);
	}, [
		character.skillProficiencies,
		stats.scores,
		proficiency,
		deferred,
		onlyProficient,
	]);

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<div className="relative min-w-0 flex-1">
					<label htmlFor={searchId} className="sr-only">
						Buscar perícia
					</label>
					<Search
						aria-hidden
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						id={searchId}
						type="search"
						spellCheck={false}
						autoComplete="off"
						placeholder="Buscar perícia…"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						className="h-11 pl-9"
					/>
				</div>
				<button
					type="button"
					aria-pressed={onlyProficient}
					onClick={() => setOnlyProficient((v) => !v)}
					className={cn(
						"min-h-11 shrink-0 cursor-pointer select-none rounded-xl border px-3 text-[13px] font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
						onlyProficient
							? "border-primary/40 bg-primary/10 text-foreground"
							: "border-border/70 text-muted-foreground [@media(hover:hover)]:hover:text-foreground",
					)}
				>
					Proficientes
				</button>
			</div>

			{rows.length === 0 ? (
				<div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-border/70 bg-background/30 px-5 py-8 text-center">
					<p className="text-sm font-semibold">Nenhuma perícia encontrada</p>
					<Button
						type="button"
						variant="outline"
						className="min-h-11"
						onClick={() => {
							setQuery("");
							setOnlyProficient(false);
						}}
					>
						Limpar filtros
					</Button>
				</div>
			) : (
				<ul className="divide-y divide-border/50">
					{rows.map((row) => (
						<li key={row.id}>
							<button
								type="button"
								disabled={rolls.rolling}
								aria-label={`Rolar ${row.name} (${formatModifier(row.modifier)})`}
								onClick={() => rolls.check(row.name, row.modifier)}
								className="flex min-h-11 w-full cursor-pointer select-none items-center gap-2.5 rounded-lg px-1 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:bg-muted/40"
							>
								<span className="w-8 shrink-0 text-[11px] font-semibold text-muted-foreground">
									{row.attributeShort}
								</span>
								<span className="min-w-0 flex-1 truncate text-[13.5px]">
									{row.name}
								</span>
								{row.level !== "none" ? (
									<span
										role="img"
										aria-label={
											row.level === "expertise" ? "Especialista" : "Proficiente"
										}
										className="flex shrink-0 gap-0.5"
									>
										<i className="size-1.5 rounded-full bg-primary" />
										{row.level === "expertise" ? (
											<i className="size-1.5 rounded-full bg-primary" />
										) : null}
									</span>
								) : null}
								<span className="w-9 shrink-0 text-right text-[14px] font-bold tabular-nums">
									{formatModifier(row.modifier)}
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
