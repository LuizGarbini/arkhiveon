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

/** Filtro discreto: texto sobre fundo suave; o ativo ganha o acento. */
const chip = (active: boolean) =>
	cn(
		"min-h-8 shrink-0 cursor-pointer select-none rounded-full px-3 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(pointer:coarse)]:min-h-11",
		active
			? "bg-primary/15 text-foreground ring-1 ring-primary/40"
			: "bg-muted/60 text-muted-foreground [@media(hover:hover)]:hover:text-foreground",
	);

/** Marca de proficiência: anel vazio, ponto cheio ou dois pontos (especialista). */
function Pips({ level }: { level: "none" | "proficient" | "expertise" }) {
	if (level === "none") {
		return (
			<span
				aria-hidden
				className="size-2 rounded-full border border-muted-foreground/40"
			/>
		);
	}
	return (
		<span
			role="img"
			aria-label={level === "expertise" ? "Especialista" : "Proficiente"}
			className="flex gap-0.5"
		>
			<i className="size-2 rounded-full bg-primary" />
			{level === "expertise" ? (
				<i className="size-2 rounded-full bg-primary" />
			) : null}
		</span>
	);
}

/**
 * Perícias do D&D 5e numa lista densa: marca de proficiência, nome, atributo e,
 * à direita, o modificador (é o que se rola). Usa os atributos dos itens
 * equipados.
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
					className="h-10 pl-9 [@media(pointer:coarse)]:h-11"
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
				<ul className="grid gap-x-6 @[44rem]:grid-cols-2">
					{rows.map((row) => (
						<li key={row.id} className="border-b border-border/40">
							<button
								type="button"
								disabled={rolls.rolling}
								aria-label={`Rolar ${row.name} (${formatModifier(row.modifier)})`}
								onClick={() => rolls.check(row.name, row.modifier)}
								className="grid min-h-10 w-full cursor-pointer select-none grid-cols-[1rem_minmax(0,1fr)_auto_2.75rem] items-center gap-2.5 rounded-lg px-1.5 text-left transition-[background-color,transform] duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:bg-muted/40 [@media(pointer:coarse)]:min-h-11"
							>
								<Pips level={row.level} />
								<span
									className={cn(
										"truncate text-[13.5px]",
										row.level === "none"
											? "font-medium text-foreground/80"
											: "font-semibold text-foreground",
									)}
								>
									{row.name}
								</span>
								<span className="text-[11px] text-muted-foreground">
									{row.attributeShort}
								</span>
								<span className="text-right text-[0.9375rem] font-semibold tabular-nums">
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
