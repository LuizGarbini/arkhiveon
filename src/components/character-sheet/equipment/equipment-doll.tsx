import { User } from "lucide-react";
import {
	ABILITY_KEYS,
	ABILITY_SHORT_LABELS,
	type AbilityScoreStats,
	calculateAbilityModifier,
	EQUIP_SLOTS,
	formatModifier,
	type LinkedEntry,
} from "@/core/rules";
import type { Character, EquipSlot, Item } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { useIsMobile } from "../view/number-detail";
import { EquipmentSlotTile } from "./equipment-slot-tile";

const LEFT_SLOTS: EquipSlot[] = ["head", "neck", "cloak", "hands", "ring1"];
const RIGHT_SLOTS: EquipSlot[] = [
	"mainHand",
	"offHand",
	"armor",
	"ring2",
	"feet",
];

function AbilityStrip({ abilities }: { abilities: AbilityScoreStats }) {
	return (
		<ul className="grid w-full grid-cols-3 gap-2 sm:grid-cols-6">
			{ABILITY_KEYS.map((key) => {
				const stat = abilities[key];
				const changed = stat.delta !== 0;
				return (
					<li
						key={key}
						title={stat.parts
							.map((p) =>
								p.kind === "base"
									? `${p.label}: ${p.value}`
									: p.kind === "set"
										? `${p.label}: fixa em ${p.value}`
										: `${p.label}: ${formatModifier(p.value)}`,
							)
							.join("\n")}
						className={cn(
							"rounded-xl border px-1 py-2 text-center",
							changed
								? stat.delta > 0
									? "border-emerald-400/35 bg-emerald-400/10"
									: "border-rose-400/35 bg-rose-400/10"
								: "border-border/70 bg-background/40",
						)}
					>
						<p className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground">
							{ABILITY_SHORT_LABELS[key]}
						</p>
						<p className="font-display text-2xl leading-tight font-bold tabular-nums">
							{stat.total}
						</p>
						<p className="text-[11px] font-semibold text-muted-foreground tabular-nums">
							{formatModifier(calculateAbilityModifier(stat.total))}
						</p>
						<p className="h-3.5 text-[10px] tabular-nums">
							{changed ? (
								<>
									<span className="text-muted-foreground line-through">
										{stat.base}
									</span>{" "}
									<span
										className={cn(
											"font-bold",
											stat.delta > 0 ? "text-emerald-300" : "text-rose-300",
										)}
									>
										{stat.delta > 0 ? "▲" : "▼"} {Math.abs(stat.delta)}
									</span>
								</>
							) : null}
						</p>
					</li>
				);
			})}
		</ul>
	);
}

/**
 * Boneco: o personagem no centro, os slots dos dois lados e os atributos
 * embaixo, já com os itens. No celular vira uma grade de slots.
 */
export function EquipmentDoll({
	character,
	bySlot,
	abilities,
	portraitUrl,
	imageFor,
	canEdit,
	selectedSlot,
	onSelectSlot,
}: {
	character: Character;
	bySlot: ReadonlyMap<EquipSlot, LinkedEntry>;
	abilities: AbilityScoreStats;
	portraitUrl: string;
	imageFor: (item: Item) => string;
	canEdit: boolean;
	selectedSlot: EquipSlot | null;
	onSelectSlot: (slot: EquipSlot) => void;
}) {
	const tile = (slot: EquipSlot, layout: "doll" | "grid") => {
		const linked = bySlot.get(slot);
		return (
			<EquipmentSlotTile
				key={slot}
				slot={slot}
				linked={linked}
				imageUrl={linked ? imageFor(linked.item) : ""}
				canEdit={canEdit}
				selected={selectedSlot === slot}
				onSelect={onSelectSlot}
				layout={layout}
			/>
		);
	};
	const mobile = useIsMobile();
	const summary =
		[
			character.race,
			character.class,
			character.level ? `Nível ${character.level}` : null,
		]
			.filter(Boolean)
			.join(" · ") || "Sem classe definida";

	return (
		<div className="relative flex min-h-0 flex-col gap-4 overflow-hidden rounded-2xl border border-border/70 bg-background/30 p-3 sm:p-4">
			<div
				aria-hidden
				className="pointer-events-none absolute top-1/4 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
			/>

			{mobile ? (
				// Celular: grade simples de slots
				<div className="relative grid grid-cols-3 gap-2">
					{EQUIP_SLOTS.map((slot) => tile(slot, "grid"))}
				</div>
			) : (
				// Desktop: boneco
				<div className="relative grid flex-1 grid-cols-[104px_1fr_104px] items-stretch gap-4">
					<div className="flex flex-col justify-between gap-2">
						{LEFT_SLOTS.map((slot) => tile(slot, "doll"))}
					</div>
					<div className="flex min-w-0 items-center justify-center">
						<figure className="relative h-full max-h-[340px] w-full max-w-[250px] overflow-hidden rounded-t-[120px] rounded-b-2xl border border-border/80 bg-gradient-to-b from-primary/25 to-card shadow-[0_0_60px_var(--primary-glow)]">
							{portraitUrl ? (
								<img
									src={portraitUrl}
									alt=""
									className="h-full w-full object-cover"
								/>
							) : (
								<span className="flex h-full w-full items-center justify-center text-primary/70">
									<User className="size-1/2" strokeWidth={1} aria-hidden />
								</span>
							)}
							<figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-3 pt-10 pb-3 text-center">
								<p className="font-display text-lg leading-tight font-semibold">
									{character.characterName}
								</p>
								<p className="mt-0.5 truncate text-xs text-muted-foreground">
									{summary}
								</p>
							</figcaption>
						</figure>
					</div>
					<div className="flex flex-col justify-between gap-2">
						{RIGHT_SLOTS.map((slot) => tile(slot, "doll"))}
					</div>
				</div>
			)}

			<div className="relative">
				<AbilityStrip abilities={abilities} />
			</div>
		</div>
	);
}
