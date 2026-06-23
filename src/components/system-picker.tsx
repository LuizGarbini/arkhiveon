import { ArrowRight, Bookmark, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { isLayoutTemplate } from "@/lib/sheet-modules";
import type { RpgSystem } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { SYSTEM_CONFIG, SYSTEM_LIST } from "@/lib/systems";
import { Input } from "./ui/input";

export type SystemPickerSelection =
	| { type: "system"; system: RpgSystem }
	| { type: "layout"; layoutTemplateId: string; system: RpgSystem };

interface SystemPickerProps {
	value?: RpgSystem;
	layoutTemplateId?: string;
	onSelect: (selection: SystemPickerSelection) => void;
}

export function SystemPicker({
	value,
	layoutTemplateId,
	onSelect,
}: SystemPickerProps) {
	const [search, setSearch] = useState("");
	const customTemplates = useRPGStore((state) => state.customTemplates || []);
	const savedLayouts = useMemo(
		() => customTemplates.filter(isLayoutTemplate),
		[customTemplates],
	);

	const layoutOptions = savedLayouts.map((template) => {
		const baseLabel =
			SYSTEM_CONFIG[template.baseSystem]?.label ?? template.baseSystem;
		return {
			type: "layout" as const,
			id: template.id,
			system: template.baseSystem,
			label: template.name,
			tagline: `${baseLabel} · Layout salvo`,
			description:
				template.description ||
				`${template.sheetLayout.modules.filter((module) => module.enabled).length} blocos configurados`,
			Icon: Bookmark,
			bgAccent: "from-violet-500/15 to-primary/5",
			accent: "text-violet-300",
		};
	});

	const systemOptions = SYSTEM_LIST.map((system) => ({
		type: "system" as const,
		id: system.value,
		system: system.value,
		label: system.label,
		tagline: system.tagline,
		description: system.description,
		Icon: system.Icon,
		bgAccent: system.bgAccent,
		accent: system.accent,
	}));

	const allOptions = [...layoutOptions, ...systemOptions];

	const filtered = allOptions.filter((option) => {
		const q = search.toLowerCase();
		return (
			option.label.toLowerCase().includes(q) ||
			option.tagline.toLowerCase().includes(q) ||
			option.description.toLowerCase().includes(q)
		);
	});

	return (
		<div className="space-y-4">
			<div className="relative">
				<Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Buscar sistema ou layout salvo..."
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					className="h-10 rounded-2xl pl-9 text-[13px]"
					autoFocus
				/>
			</div>

			{savedLayouts.length > 0 && !search && (
				<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
					Seus layouts salvos
				</p>
			)}

			<div className="grid max-h-[58vh] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
				{filtered.map((option) => {
					const Icon = option.Icon;
					const active =
						option.type === "layout"
							? layoutTemplateId === option.id
							: !layoutTemplateId && value === option.system;

					return (
						<button
							key={`${option.type}-${option.id}`}
							type="button"
							onClick={() =>
								onSelect(
									option.type === "layout"
										? {
												type: "layout",
												layoutTemplateId: option.id,
												system: option.system,
											}
										: { type: "system", system: option.system },
								)
							}
							className={`group relative flex min-h-28 items-start gap-3 rounded-2xl border p-4 text-left shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
								active
									? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
									: "border-border/70 bg-card-elevated/60 hover:border-primary/35 hover:bg-card-elevated"
							}`}
						>
							<div
								className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${option.bgAccent} ring-1 ring-border/70 ${option.accent}`}
							>
								<Icon className="h-4 w-4" strokeWidth={1.6} />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center justify-between gap-2">
									<h4 className="font-display text-[13px] font-bold leading-tight text-foreground">
										{option.label}
									</h4>
									<ArrowRight
										className={`h-3 w-3 shrink-0 transition-all ${
											active
												? "translate-x-0.5 text-primary"
												: "text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-foreground"
										}`}
									/>
								</div>
								<p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
									{option.tagline}
								</p>
								<p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
									{option.description}
								</p>
							</div>
						</button>
					);
				})}
				{filtered.length === 0 && (
					<p className="col-span-full py-8 text-center text-[12px] text-muted-foreground">
						Nenhum resultado para &quot;{search}&quot;
					</p>
				)}
			</div>
		</div>
	);
}
