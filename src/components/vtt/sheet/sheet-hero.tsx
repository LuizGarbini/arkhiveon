import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Character } from "@/lib/store";

/** "DD" para "Dante Diavolo": o retrato quando não há imagem. */
export function monogram(name: string): string {
	const letters = name
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
	return letters || "?";
}

/**
 * Cabeçalho da ficha na mesa: retrato, nome e quem joga. Na janela larga o
 * retrato vira o topo de uma coluna à esquerda.
 */
export function SheetHero({
	character,
	portraitUrl,
	onOpenEquipment,
}: {
	character: Character;
	/** Vazio quando a imagem não existe ou não pode ser vista por quem olha. */
	portraitUrl: string;
	/** Só D&D 5e: abre o equipamento e a build. */
	onOpenEquipment?: () => void;
}) {
	const summary = [
		character.race,
		character.class,
		character.level ? `Nível ${character.level}` : null,
	]
		.filter(Boolean)
		.join(" · ");
	return (
		<header className="relative flex items-center gap-3.5 @[44rem]:flex-col @[44rem]:items-stretch @[44rem]:gap-3">
			<div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-[1.25rem] border border-border/70 bg-gradient-to-br from-primary/35 to-card shadow-inner @[44rem]:aspect-[5/4] @[44rem]:size-auto @[44rem]:w-full @[44rem]:rounded-2xl">
				{portraitUrl ? (
					<img
						src={portraitUrl}
						alt=""
						draggable={false}
						className="size-full object-cover"
					/>
				) : (
					<span
						aria-hidden
						className="flex size-full items-center justify-center font-display text-[1.65rem] font-semibold text-foreground/85 @[44rem]:text-5xl"
					>
						{monogram(character.characterName || "?")}
					</span>
				)}
			</div>
			<div className="min-w-0 flex-1 @[44rem]:flex-none">
				<h2 className="font-display text-[1.375rem] leading-tight font-semibold tracking-[0.01em] text-foreground @[44rem]:text-[1.25rem]">
					{character.characterName}
				</h2>
				{summary ? (
					<p className="mt-1 text-[13px] text-muted-foreground">{summary}</p>
				) : null}
				{character.playerName ? (
					<p className="mt-0.5 text-xs text-muted-foreground">
						Jogador: {character.playerName}
					</p>
				) : null}
			</div>
			{onOpenEquipment ? (
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={onOpenEquipment}
					aria-label="Abrir equipamento e build"
					className="size-11 shrink-0 @[44rem]:absolute @[44rem]:top-2 @[44rem]:right-2 @[44rem]:size-9 @[44rem]:bg-background/70 @[44rem]:backdrop-blur-md"
				>
					<Shield className="size-4" aria-hidden />
				</Button>
			) : null}
		</header>
	);
}
