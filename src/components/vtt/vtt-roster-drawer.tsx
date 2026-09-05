import {
	Plus,
	Search,
	Shield,
	Skull,
	Sparkles,
	User,
	Users,
	X,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRPGStore } from "@/lib/store";
import type { Character, Npc } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { snapToGrid } from "@/lib/vtt/grid-math";
import type { VTTScene, VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import {
	vttChipClass,
	vttIconButtonClass,
	vttIconButtonIdleClass,
} from "./vtt-chrome";

interface VTTRosterDrawerProps {
	scene: VTTScene | null;
	onSpawnToken: (tokenData: Partial<VTTToken>) => Promise<void>;
}

export function VTTRosterDrawer({ scene, onSpawnToken }: VTTRosterDrawerProps) {
	const { showRosterDrawer, setShowRosterDrawer, viewport, isGM } =
		useVTTStore();
	const characters = useRPGStore((s) => s.characters);
	const npcs = useRPGStore((s) => s.npcs);

	const nameFieldId = useId();
	const hpFieldId = useId();
	const [activeTab, setActiveTab] = useState<"characters" | "npcs" | "custom">(
		"characters",
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [spawningId, setSpawningId] = useState<string | null>(null);

	// Quick Custom Token Form
	const [customName, setCustomName] = useState("");
	const [customHp, setCustomHp] = useState(25);
	const [customSize, setCustomSize] = useState(1);

	const filteredCharacters = useMemo(() => {
		if (!searchQuery.trim()) return characters;
		const q = searchQuery.toLowerCase();
		return characters.filter(
			(c) =>
				(c.characterName || "").toLowerCase().includes(q) ||
				(c.class || "").toLowerCase().includes(q) ||
				(c.race || "").toLowerCase().includes(q),
		);
	}, [characters, searchQuery]);

	const filteredNPCs = useMemo(() => {
		if (!searchQuery.trim()) return npcs;
		const q = searchQuery.toLowerCase();
		return npcs.filter(
			(n) =>
				(n.name || "").toLowerCase().includes(q) ||
				(n.role || "").toLowerCase().includes(q) ||
				(n.kind || "").toLowerCase().includes(q),
		);
	}, [npcs, searchQuery]);

	if (!showRosterDrawer) return null;

	// Calculate center of current camera viewport in world coordinates
	const getSpawnPosition = (tokenSizeCells = 1) => {
		const screenCenterX = window.innerWidth / 2;
		const screenCenterY = window.innerHeight / 2;
		const worldX = (screenCenterX - viewport.x) / viewport.scale;
		const worldY = (screenCenterY - viewport.y) / viewport.scale;

		const gridSize = scene?.gridSize || 70;
		const maxX = (scene?.width || 4000) - gridSize;
		const maxY = (scene?.height || 4000) - gridSize;

		const clampedX = Math.max(gridSize, Math.min(worldX, maxX));
		const clampedY = Math.max(gridSize, Math.min(worldY, maxY));

		return snapToGrid(
			{ x: clampedX, y: clampedY },
			scene?.gridType || "square",
			gridSize,
			tokenSizeCells,
		);
	};

	const handleSpawnCharacter = async (char: Character) => {
		if (!scene) return;
		setSpawningId(char.id);
		try {
			const pos = getSpawnPosition(1);
			await onSpawnToken({
				sceneId: scene.id,
				characterId: char.id,
				name: char.characterName || "Personagem",
				avatarUrl: char.imageUrl || null,
				layer: "token",
				x: pos.x,
				y: pos.y,
				sizeCells: 1.0,
				rotation: 0,
				hpCurrent: char.health ?? 20,
				hpMax: char.healthMax ?? 20,
				elevation: 0,
				conditions: [],
				auras: [],
				visionRange: 6,
				isLocked: false,
				isHidden: false,
				controlledBy: [],
			});
		} finally {
			setSpawningId(null);
		}
	};

	const handleSpawnNPC = async (npc: Npc) => {
		if (!scene) return;
		setSpawningId(npc.id);
		try {
			const pos = getSpawnPosition(1);
			await onSpawnToken({
				sceneId: scene.id,
				npcId: npc.id,
				name: npc.name || "NPC",
				avatarUrl: npc.imageUrl || null,
				layer: isGM ? "token" : "token",
				x: pos.x,
				y: pos.y,
				sizeCells: 1.0,
				rotation: 0,
				hpCurrent: 30,
				hpMax: 30,
				elevation: 0,
				conditions: [],
				auras: [],
				visionRange: 6,
				isLocked: false,
				isHidden: false,
				controlledBy: [],
			});
		} finally {
			setSpawningId(null);
		}
	};

	const handleSpawnCustomToken = async () => {
		if (!scene || !customName.trim()) return;
		setSpawningId("custom");
		try {
			const pos = getSpawnPosition(customSize);
			await onSpawnToken({
				sceneId: scene.id,
				name: customName.trim(),
				avatarUrl: null,
				layer: "token",
				x: pos.x,
				y: pos.y,
				sizeCells: customSize,
				rotation: 0,
				hpCurrent: customHp,
				hpMax: customHp,
				elevation: 0,
				conditions: [],
				auras: [],
				visionRange: 6,
				isLocked: false,
				isHidden: false,
				controlledBy: [],
			});
			setCustomName("");
		} finally {
			setSpawningId(null);
		}
	};

	return (
		<div className="absolute right-4 top-16 bottom-16 z-40 flex w-80 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 text-foreground shadow-2xl backdrop-blur-md pointer-events-auto select-none sm:w-96">
			<div className="flex items-center justify-between border-b border-border/60 p-4">
				<div className="flex items-center gap-2">
					<Users className="h-5 w-5 text-primary" />
					<h3 className="font-display text-sm font-bold tracking-wide text-foreground">
						Personagens & Bestiário
					</h3>
				</div>
				<button
					type="button"
					onClick={() => setShowRosterDrawer(false)}
					className={cn(vttIconButtonClass, vttIconButtonIdleClass)}
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			<div className="grid grid-cols-3 gap-1.5 border-b border-border/60 bg-background/40 p-2">
				<button
					type="button"
					onClick={() => setActiveTab("characters")}
					className={cn(
						"flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] font-bold transition-all duration-150 ease-out active:scale-[0.98] cursor-pointer",
						activeTab === "characters"
							? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					<Shield className="h-3 w-3" />
					<span>Heróis ({characters.length})</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("npcs")}
					className={cn(
						"flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] font-bold transition-all duration-150 ease-out active:scale-[0.98] cursor-pointer",
						activeTab === "npcs"
							? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					<Skull className="h-3 w-3" />
					<span>NPCs ({npcs.length})</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("custom")}
					className={cn(
						"flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] font-bold transition-all duration-150 ease-out active:scale-[0.98] cursor-pointer",
						activeTab === "custom"
							? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					<Sparkles className="h-3 w-3" />
					<span>Criar Monstro</span>
				</button>
			</div>

			{/* Content Area */}
			{activeTab === "custom" ? (
				<div className="p-4 space-y-3.5 overflow-y-auto">
					<div className="space-y-1.5">
						<label
							htmlFor={nameFieldId}
							className="text-[11px] font-bold text-muted-foreground"
						>
							Nome da criatura
						</label>
						<Input
							id={nameFieldId}
							value={customName}
							onChange={(e) => setCustomName(e.target.value)}
							placeholder="Ex: Dragão Vermelho Jovem, Goblin..."
							className="h-11 text-xs"
						/>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1.5">
							<label
								htmlFor={hpFieldId}
								className="text-[11px] font-bold text-muted-foreground"
							>
								Pontos de vida
							</label>
							<Input
								id={hpFieldId}
								type="number"
								value={customHp}
								onChange={(e) =>
									setCustomHp(Number.parseInt(e.target.value, 10) || 1)
								}
								className="h-11 text-xs font-mono"
							/>
						</div>

						<fieldset className="space-y-1.5">
							<legend className="text-[11px] font-bold text-muted-foreground">
								Tamanho no grid
							</legend>
							<div className="grid grid-cols-4 gap-1">
								{[1, 2, 3, 4].map((sz) => (
									<button
										type="button"
										key={sz}
										onClick={() => setCustomSize(sz)}
										className={cn(
											vttChipClass,
											"px-0",
											customSize === sz
												? "border-primary/40 bg-primary text-primary-foreground"
												: "border-border/70 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground",
										)}
									>
										{sz}x
									</button>
								))}
							</div>
						</fieldset>
					</div>

					<Button
						type="button"
						disabled={!customName.trim() || spawningId === "custom"}
						onClick={handleSpawnCustomToken}
						className="mt-2 h-11 w-full gap-1.5 rounded-2xl text-xs font-bold"
					>
						<Plus className="h-4 w-4" />
						<span>Instanciar Monstro no Campo de Visão</span>
					</Button>
				</div>
			) : (
				<>
					{/* Search Input */}
					<div className="border-b border-border/60 p-3">
						<div className="relative">
							<Search className="absolute top-3.5 left-3 h-3.5 w-3.5 text-muted-foreground" />
							<Input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder={
									activeTab === "characters"
										? "Buscar por nome ou classe..."
										: "Buscar por NPC ou ameaça..."
								}
								className="h-11 rounded-xl pl-9 text-xs"
							/>
						</div>
					</div>

					{/* Entity List */}
					<div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
						{activeTab === "characters" ? (
							filteredCharacters.length > 0 ? (
								filteredCharacters.map((char) => (
									<div
										key={char.id}
										className="group flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/50 p-2.5 transition-all duration-150 hover:bg-muted"
									>
										<div className="flex items-center gap-3 min-w-0">
											<div className="relative h-10 w-10 shrink-0 rounded-full border border-primary/40 bg-primary/20 overflow-hidden flex items-center justify-center">
												{char.imageUrl ? (
													<img
														src={char.imageUrl}
														alt={char.characterName}
														className="h-full w-full object-cover"
													/>
												) : (
													<User className="h-5 w-5 text-primary" />
												)}
											</div>
											<div className="min-w-0">
												<h4 className="truncate text-xs font-bold text-foreground transition-colors group-hover:text-primary">
													{char.characterName}
												</h4>
												<p className="truncate text-[10px] text-muted-foreground">
													{char.class
														? `${char.class} Lv.${char.level || 1}`
														: char.race || "Aventureiro"}
												</p>
											</div>
										</div>

										<Button
											type="button"
											size="sm"
											disabled={spawningId === char.id}
											onClick={() => handleSpawnCharacter(char)}
											className="h-11 shrink-0 gap-1 rounded-xl px-2.5 text-[11px] font-bold"
										>
											<Plus className="h-3 w-3" />
											<span>Colocar</span>
										</Button>
									</div>
								))
							) : (
								<div className="flex flex-col items-center justify-center py-10 text-center text-xs text-muted-foreground">
									<User className="mb-2 h-8 w-8 text-muted-foreground/40" />
									<span>Nenhum personagem encontrado</span>
								</div>
							)
						) : filteredNPCs.length > 0 ? (
							filteredNPCs.map((npc) => (
								<div
									key={npc.id}
									className="group flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/50 p-2.5 transition-all duration-150 hover:bg-muted"
								>
									<div className="flex min-w-0 items-center gap-3">
										<div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/40 bg-primary/20">
											{npc.imageUrl ? (
												<img
													src={npc.imageUrl}
													alt={npc.name}
													className="h-full w-full object-cover"
												/>
											) : (
												<Skull className="h-5 w-5 text-primary" />
											)}
										</div>
										<div className="min-w-0">
											<h4 className="truncate text-xs font-bold text-foreground transition-colors group-hover:text-primary">
												{npc.name}
											</h4>
											<p className="truncate text-[10px] text-muted-foreground">
												{npc.role || npc.kind || "NPC"}
											</p>
										</div>
									</div>

									<Button
										type="button"
										size="sm"
										disabled={spawningId === npc.id}
										onClick={() => handleSpawnNPC(npc)}
										className="h-11 shrink-0 gap-1 rounded-xl px-2.5 text-[11px] font-bold"
									>
										<Plus className="h-3 w-3" />
										<span>Colocar</span>
									</Button>
								</div>
							))
						) : (
							<div className="flex flex-col items-center justify-center py-10 text-center text-xs text-muted-foreground">
								<Skull className="mb-2 h-8 w-8 text-muted-foreground/40" />
								<span>Nenhum NPC encontrado</span>
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}
