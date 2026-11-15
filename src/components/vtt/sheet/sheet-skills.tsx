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

const ATTRIBUTE_FILTERS = [
	{ key: "strength", short: "FOR" },
	{ key: "dexterity", short: "DES" },
	{ key: "constitution", short: "CON" },
	{ key: "intelligence", short: "INT" },
	{ key: "wisdom", short: "SAB" },
	{ key: "charisma", short: "CAR" },
] as const;

type Filter = "all" | "proficient" | (typeof ATTRIBUTE_FILTERS)[number]["key"];

const chip = (active: boolean) =>
	cn(
		"min-h-11 shrink-0 cursor-pointer select-none rounded-full border px-3.5 text-[12.5px] font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
		active
			? "border-primary/45 bg-primary/15 text-foreground"
			: "border-border/70 text-muted-foreground [@media(hover:hover)]:hover:text-foreground",
	);

/**
 * Perícias do D&D 5e em cartões: o modificador é o número grande (é o que se
 * rola), com marca de proficiente/especialista e filtros por atributo. Usa os
 * atributos dos itens equipados.
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
	const [filter, setFilter] = useState<Filter>("all");
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
		}).filter((row) => {
			if (filter === "proficient" && row.level === "none") return false;
			if (
				filter !== "all" &&
				filter !== "proficient" &&
				row.attributeKey !== filter
			)
				return false;
			return (
				!q ||
				normalize(row.name).includes(q) ||
				normalize(row.attributeName).includes(q) ||
				normalize(row.attributeShort).includes(q)
			);
		});
	}, [
		character.skillProficiencies,
		stats.scores,
		proficiency,
		deferred,
		filter,
	]);

	return (
		<div className="space-y-3">
			<div className="relative">
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

			<div
				role="toolbar"
				aria-label="Filtrar perícias"
				className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5"
			>
				<button
					type="button"
					aria-pressed={filter === "all"}
					onClick={() => setFilter("all")}
					className={chip(filter === "all")}
				>
					Todas
				</button>
				<button
					type="button"
					aria-pressed={filter === "proficient"}
					onClick={() => setFilter("proficient")}
					className={chip(filter === "proficient")}
				>
					Proficientes
				</button>
				{ATTRIBUTE_FILTERS.map(({ key, short }) => (
					<button
						key={key}
						type="button"
						aria-pressed={filter === key}
						onClick={() => setFilter(filter === key ? "all" : key)}
						className={chip(filter === key)}
					>
						{short}
					</button>
				))}
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
							setFilter("all");
						}}
					>
						Limpar filtros
					</Button>
				</div>
			) : (
				<ul className="grid grid-cols-2 gap-2 @[44rem]:grid-cols-3">
					{rows.map((row) => (
						<li key={row.id}>
							<button
								type="button"
								disabled={rolls.rolling}
								aria-label={`Rolar ${row.name} (${formatModifier(row.modifier)})`}
								onClick={() => rolls.check(row.name, row.modifier)}
								className={cn(
									"relative flex min-h-[4.75rem] w-full cursor-pointer select-none flex-col items-start gap-1 rounded-2xl border px-3 py-2.5 text-left transition-[background-color,transform,border-color] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
									row.level !== "none"
										? "border-primary/40 bg-gradient-to-b from-primary/15 to-primary/5 [@media(hover:hover)]:hover:from-primary/20"
										: "border-border/70 bg-background/40 [@media(hover:hover)]:hover:border-primary/35 [@media(hover:hover)]:hover:bg-muted/40",
								)}
							>
								{row.level !== "none" ? (
									<span
										role="img"
										aria-label={
											row.level === "expertise" ? "Especialista" : "Proficiente"
										}
										className="absolute top-3 right-3 flex gap-0.5"
									>
										<i className="size-1.5 rounded-full bg-primary" />
										{row.level === "expertise" ? (
											<i className="size-1.5 rounded-full bg-primary" />
										) : null}
									</span>
								) : null}
								<span className="font-display text-[1.6rem] leading-none font-semibold tabular-nums">
									{formatModifier(row.modifier)}
								</span>
								<span className="truncate text-[13px] font-semibold">
									{row.name}
								</span>
								<span className="text-[11px] text-muted-foreground">
									{row.attributeShort}
									{row.level === "expertise"
										? " · especialista"
										: row.level === "proficient"
											? " · proficiente"
											: ""}
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
