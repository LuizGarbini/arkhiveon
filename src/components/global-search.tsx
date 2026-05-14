import { useNavigate } from "@tanstack/react-router";
import {
	BookOpen,
	Command,
	MapIcon,
	Package,
	ScrollText,
	Search,
	User,
	Users,
} from "lucide-react";
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "./ui/dialog";

interface GlobalSearchProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type SearchResult = {
	id: string;
	title: string;
	subtitle?: string;
	type: "character" | "npc" | "session" | "item" | "location" | "lore";
};

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const characters = useRPGStore((s) => s.characters);
	const npcs = useRPGStore((s) => s.npcs);
	const sessions = useRPGStore((s) => s.sessions);
	const items = useRPGStore((s) => s.items);
	const locations = useRPGStore((s) => s.locations);
	const lores = useRPGStore((s) => s.lores);

	const results = useMemo(() => {
		if (!open) return [];

		const q = deferredQuery.trim().toLowerCase();
		if (!q) return [];

		const allResults: SearchResult[] = [
			...characters.map((c) => ({
				id: c.id,
				title: c.characterName || "Sem nome",
				subtitle: c.class || c.race || "Personagem",
				type: "character" as const,
			})),
			...npcs.map((n) => ({
				id: n.id,
				title: n.name || "Sem nome",
				subtitle:
					n.role || n.race || (n.kind === "monster" ? "Monstro" : "NPC"),
				type: "npc" as const,
			})),
			...sessions.map((s) => ({
				id: s.id,
				title: s.title || "Sessão sem título",
				subtitle: s.date || "Sessão",
				type: "session" as const,
			})),
			...items.map((i) => ({
				id: i.id,
				title: i.name || "Item sem nome",
				subtitle: i.rarity || "Item",
				type: "item" as const,
			})),
			...locations.map((l) => ({
				id: l.id,
				title: l.name || "Local sem nome",
				subtitle: l.type || "Local",
				type: "location" as const,
			})),
			...lores.map((l) => ({
				id: l.id,
				title: l.title || "Lore sem título",
				subtitle: "História",
				type: "lore" as const,
			})),
		];

		return allResults
			.filter(
				(r) =>
					r.title.toLowerCase().includes(q) ||
					r.subtitle?.toLowerCase().includes(q),
			)
			.slice(0, 8);
	}, [
		open,
		deferredQuery,
		characters,
		npcs,
		sessions,
		items,
		locations,
		lores,
	]);

	const handleSelect = useCallback(
		(result: SearchResult) => {
			if (result.type === "character") {
				void navigate({
					to: "/sheets/$characterId",
					params: { characterId: result.id },
				});
			} else if (result.type === "npc") {
				void navigate({ to: "/npcs" });
			} else if (result.type === "session") {
				void navigate({ to: "/sessions" });
			} else if (result.type === "item") {
				void navigate({ to: "/items" });
			} else if (result.type === "location") {
				void navigate({ to: "/locations" });
			} else {
				void navigate({ to: "/lore" });
			}

			onOpenChange(false);
			setQuery("");
		},
		[navigate, onOpenChange],
	);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!open) return;

			if (e.key === "ArrowDown") {
				e.preventDefault();
				if (results.length === 0) return;
				setSelectedIndex((prev) => (prev + 1) % results.length);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				if (results.length === 0) return;
				setSelectedIndex(
					(prev) => (prev - 1 + results.length) % results.length,
				);
			} else if (e.key === "Enter" && results[selectedIndex]) {
				e.preventDefault();
				handleSelect(results[selectedIndex]);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleSelect, open, results, selectedIndex]);

	const icons = {
		character: User,
		npc: Users,
		session: ScrollText,
		item: Package,
		location: MapIcon,
		lore: BookOpen,
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="max-w-2xl overflow-hidden p-0 shadow-2xl"
			>
				<div className="relative flex items-center border-b border-border/50 px-4 py-3.5">
					<Search className="h-5 w-5 text-muted-foreground" />
					<input
						autoFocus
						className="ml-3 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
						placeholder="Pesquisar personagens, itens, lores..."
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setSelectedIndex(0);
						}}
					/>
					<div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-0.5 shadow-xs">
						<span className="text-[9px] font-bold text-muted-foreground tracking-tight">
							ESC
						</span>
					</div>
				</div>

				<div className="max-h-[400px] overflow-y-auto p-2">
					{query.trim() === "" ? (
						<div className="flex flex-col items-center justify-center py-10 text-center">
							<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
								<Command className="h-6 w-6" />
							</div>
							<p className="mt-4 text-sm font-medium text-foreground">
								O que você está procurando?
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Pesquise por qualquer registro no seu grimório.
							</p>
						</div>
					) : results.length > 0 ? (
						<div className="space-y-1">
							{results.map((result, index) => {
								const Icon = icons[result.type];
								return (
									<button
										type="button"
										key={`${result.type}-${result.id}`}
										onClick={() => handleSelect(result)}
										className={cn(
											"flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
											index === selectedIndex
												? "bg-primary/10 text-primary"
												: "hover:bg-muted/50 text-foreground",
										)}
									>
										<div
											className={cn(
												"flex h-9 w-9 items-center justify-center rounded-lg border",
												index === selectedIndex
													? "border-primary/30 bg-primary/10"
													: "border-border/50 bg-background",
											)}
										>
											<Icon className="h-4 w-4" />
										</div>
										<div className="flex flex-1 flex-col min-w-0">
											<span className="truncate text-sm font-bold">
												{result.title}
											</span>
											{result.subtitle && (
												<span className="truncate text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
													{result.subtitle}
												</span>
											)}
										</div>
										<div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">
											{result.type}
										</div>
									</button>
								);
							})}
						</div>
					) : (
						<div className="py-10 text-center">
							<p className="text-sm text-muted-foreground">
								Nenhum resultado encontrado para "{query}"
							</p>
						</div>
					)}
				</div>

				<div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-4 py-3">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-1.5">
							<div className="flex h-5 w-5 items-center justify-center rounded border bg-background text-[10px] font-bold shadow-sm">
								↓
							</div>
							<div className="flex h-5 w-5 items-center justify-center rounded border bg-background text-[10px] font-bold shadow-sm">
								↑
							</div>
							<span className="text-[10px] text-muted-foreground">Navegar</span>
						</div>
						<div className="flex items-center gap-1.5">
							<div className="flex h-5 w-10 items-center justify-center rounded border bg-background text-[10px] font-bold shadow-sm">
								Enter
							</div>
							<span className="text-[10px] text-muted-foreground">
								Selecionar
							</span>
						</div>
					</div>
					<p className="text-[10px] font-medium text-muted-foreground">
						{results.length} resultados encontrados
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
