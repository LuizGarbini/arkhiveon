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
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRPGStore } from "@/lib/store";
import type { Character, Npc } from "@/lib/store/types";
import { snapToGrid } from "@/lib/vtt/grid-math";
import type { VTTScene, VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { cn } from "@/lib/utils";

interface VTTRosterDrawerProps {
	scene: VTTScene | null;
	onSpawnToken: (tokenData: Partial<VTTToken>) => Promise<void>;
}

export function VTTRosterDrawer({ scene, onSpawnToken }: VTTRosterDrawerProps) {
	const { showRosterDrawer, setShowRosterDrawer, viewport, isGM } = useVTTStore();
	const characters = useRPGStore((s) => s.characters);
	const npcs = useRPGStore((s) => s.npcs);

	const [activeTab, setActiveTab] = useState<"characters" | "npcs" | "custom">("characters");
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
		<div className="absolute right-4 top-16 bottom-16 z-40 w-80 sm:w-96 flex flex-col rounded-3xl border border-white/15 bg-black/85 backdrop-blur-2xl shadow-2xl overflow-hidden pointer-events-auto select-none animate-in fade-in slide-in-from-right-4 duration-200">
			{/* Drawer Header */}
			<div className="flex items-center justify-between p-4 border-b border-white/10">
				<div className="flex items-center gap-2">
					<Users className="h-5 w-5 text-primary" />
					<h3 className="font-display text-sm font-bold text-white tracking-wide">
						Personagens & Bestiário
					</h3>
				</div>
				<button
					type="button"
					onClick={() => setShowRosterDrawer(false)}
					className="h-8 w-8 flex items-center justify-center rounded-xl text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			{/* Tab Switcher */}
			<div className="grid grid-cols-3 p-2 gap-1.5 border-b border-white/10 bg-white/5">
				<button
					type="button"
					onClick={() => setActiveTab("characters")}
					className={cn(
						"flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer",
						activeTab === "characters"
							? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
							: "text-white/60 hover:bg-white/5 hover:text-white",
					)}
				>
					<Shield className="h-3 w-3" />
					<span>Heróis ({characters.length})</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("npcs")}
					className={cn(
						"flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer",
						activeTab === "npcs"
							? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
							: "text-white/60 hover:bg-white/5 hover:text-white",
					)}
				>
					<Skull className="h-3 w-3" />
					<span>NPCs ({npcs.length})</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("custom")}
					className={cn(
						"flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer",
						activeTab === "custom"
							? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
							: "text-white/60 hover:bg-white/5 hover:text-white",
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
						<label className="text-[11px] font-bold text-white/70">Nome da Criatura / Monstro</label>
						<Input
							value={customName}
							onChange={(e) => setCustomName(e.target.value)}
							placeholder="Ex: Dragão Vermelho Jovem, Goblin..."
							className="h-8.5 text-xs bg-white/5 border-white/10 rounded-xl"
						/>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1.5">
							<label className="text-[11px] font-bold text-white/70">Pontos de Vida (PV)</label>
							<Input
								type="number"
								value={customHp}
								onChange={(e) => setCustomHp(Number.parseInt(e.target.value, 10) || 1)}
								className="h-8.5 text-xs bg-white/5 border-white/10 rounded-xl font-mono"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-[11px] font-bold text-white/70">Tamanho no Grid</label>
							<div className="grid grid-cols-4 gap-1">
								{[1, 2, 3, 4].map((sz) => (
									<button
										type="button"
										key={sz}
										onClick={() => setCustomSize(sz)}
										className={cn(
											"h-8.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
											customSize === sz
												? "bg-amber-600 border-amber-500 text-white"
												: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
										)}
									>
										{sz}x
									</button>
								))}
							</div>
						</div>
					</div>

					<Button
						type="button"
						disabled={!customName.trim() || spawningId === "custom"}
						onClick={handleSpawnCustomToken}
						className="w-full h-9 rounded-2xl font-bold text-xs gap-1.5 bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20 mt-2"
					>
						<Plus className="h-4 w-4" />
						<span>Instanciar Monstro no Campo de Visão</span>
					</Button>
				</div>
			) : (
				<>
					{/* Search Input */}
					<div className="p-3 border-b border-white/10">
						<div className="relative">
							<Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/40" />
							<Input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder={
									activeTab === "characters"
										? "Buscar por nome ou classe..."
										: "Buscar por NPC ou ameaça..."
								}
								className="h-8.5 pl-8.5 text-xs bg-white/5 border-white/10 rounded-xl"
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
										className="group flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
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
												<h4 className="font-bold text-xs text-white truncate group-hover:text-primary transition-colors">
													{char.characterName}
												</h4>
												<p className="text-[10px] text-white/50 truncate">
													{char.class ? `${char.class} Lv.${char.level || 1}` : char.race || "Aventureiro"}
												</p>
											</div>
										</div>

										<Button
											type="button"
											size="sm"
											disabled={spawningId === char.id}
											onClick={() => handleSpawnCharacter(char)}
											className="h-8 px-2.5 text-[11px] font-bold rounded-xl gap-1 shrink-0"
										>
											<Plus className="h-3 w-3" />
											<span>Colocar</span>
										</Button>
									</div>
								))
							) : (
								<div className="flex flex-col items-center justify-center py-10 text-center text-white/50 text-xs">
									<User className="h-8 w-8 text-white/20 mb-2" />
									<span>Nenhum personagem encontrado</span>
								</div>
							)
						) : filteredNPCs.length > 0 ? (
							filteredNPCs.map((npc) => (
								<div
									key={npc.id}
									className="group flex items-center justify-between gap-3 p-2.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="relative h-10 w-10 shrink-0 rounded-full border border-purple-500/40 bg-purple-500/20 overflow-hidden flex items-center justify-center">
											{npc.imageUrl ? (
												<img
													src={npc.imageUrl}
													alt={npc.name}
													className="h-full w-full object-cover"
												/>
											) : (
												<Skull className="h-5 w-5 text-purple-300" />
											)}
										</div>
										<div className="min-w-0">
											<h4 className="font-bold text-xs text-white truncate group-hover:text-purple-300 transition-colors">
												{npc.name}
											</h4>
											<p className="text-[10px] text-white/50 truncate">
												{npc.role || npc.kind || "NPC"}
											</p>
										</div>
									</div>

									<Button
										type="button"
										size="sm"
										disabled={spawningId === npc.id}
										onClick={() => handleSpawnNPC(npc)}
										className="h-8 px-2.5 text-[11px] font-bold rounded-xl gap-1 shrink-0 bg-purple-600 hover:bg-purple-500 text-white"
									>
										<Plus className="h-3 w-3" />
										<span>Colocar</span>
									</Button>
								</div>
							))
						) : (
							<div className="flex flex-col items-center justify-center py-10 text-center text-white/50 text-xs">
								<Skull className="h-8 w-8 text-white/20 mb-2" />
								<span>Nenhum NPC encontrado</span>
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}
