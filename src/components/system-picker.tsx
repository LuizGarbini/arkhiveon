import { ArrowRight, Search } from "lucide-react";
import { useState } from "react";
import type { RpgSystem } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { SYSTEM_LIST } from "@/lib/systems";
import { Input } from "./ui/input";
import { LayoutTemplate } from "lucide-react";

interface SystemPickerProps {
	value?: RpgSystem;
	onSelect: (system: RpgSystem) => void;
}

/**
 * Seletor de template / sistema de RPG.
 * Agora com busca para facilitar a navegação em 35+ sistemas.
 */
export function SystemPicker({ value, onSelect }: SystemPickerProps) {
	const [search, setSearch] = useState("");
	const customTemplates = useRPGStore((state) => state.customTemplates || []);

	const allSystems = [
		...customTemplates.map((t) => ({
			value: t.id as RpgSystem,
			label: t.name,
			tagline: "Template Customizado",
			description: t.description || "Criado pelo Construtor",
			Icon: LayoutTemplate,
			bgAccent: "from-primary/10 to-transparent",
			accent: "text-primary",
		})),
		...SYSTEM_LIST,
	];

	const filtered = allSystems.filter((s) => {
		const q = search.toLowerCase();
		return (
			s.label.toLowerCase().includes(q) ||
			s.tagline.toLowerCase().includes(q) ||
			s.description.toLowerCase().includes(q)
		);
	});

	return (
		<div className="space-y-4">
			{/* Search */}
			<div className="relative">
				<Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Buscar sistema..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="h-10 rounded-2xl pl-9 text-[13px]"
					autoFocus
				/>
			</div>

			{/* Grid */}
			<div className="grid max-h-[58vh] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
				{filtered.map((s) => {
					const Icon = s.Icon;
					const active = value === s.value;
					return (
						<button
							key={s.value}
							type="button"
							onClick={() => onSelect(s.value)}
							className={`group relative flex min-h-28 items-start gap-3 rounded-2xl border p-4 text-left shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
								active
									? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
									: "border-border/70 bg-card-elevated/60 hover:border-primary/35 hover:bg-card-elevated"
							}`}
						>
							<div
								className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${s.bgAccent} ring-1 ring-border/70 ${s.accent}`}
							>
								<Icon className="h-4 w-4" strokeWidth={1.6} />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center justify-between gap-2">
									<h4 className="font-display text-[13px] font-bold leading-tight text-foreground">
										{s.label}
									</h4>
									<ArrowRight
										className={`h-3 w-3 shrink-0 transition-all ${
											active
												? "text-primary translate-x-0.5"
												: "text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-foreground"
										}`}
									/>
								</div>
								<p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
									{s.tagline}
								</p>
								<p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
									{s.description}
								</p>
							</div>
						</button>
					);
				})}
				{filtered.length === 0 && (
					<p className="col-span-full py-8 text-center text-[12px] text-muted-foreground">
						Nenhum sistema encontrado para "{search}"
					</p>
				)}
			</div>
		</div>
	);
}
