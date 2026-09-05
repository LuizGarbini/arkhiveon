import { Sparkles, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CharacterSetValue } from "../types";

export interface AgentPresetDef {
	id: string;
	name: string;
	classLabel: string;
	subclass: string;
	nex: string;
	pv: number;
	san: number;
	pe: number;
	img: string;
	fallback: string;
	presetIdx: number;
	color: string;
	badgeBg: string;
}

const ORDEM_AGENTS: AgentPresetDef[] = [
	{
		id: "agatha",
		name: "Agatha Volkom",
		classLabel: "Ocultista",
		subclass: "Graduado",
		nex: "NEX 40%",
		pv: 40,
		san: 52,
		pe: 40,
		img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Agatha - token estilo Hexatombe.png",
		fallback: "/presets/mage.png",
		presetIdx: 0,
		color:
			"from-purple-900/60 to-purple-950/90 border-purple-500/40 text-purple-200",
		badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
	},
	{
		id: "giovanni",
		name: "Giovanni Opspor",
		classLabel: "Combatente",
		subclass: "Aniquilador",
		nex: "NEX 40%",
		pv: 68,
		san: 30,
		pe: 20,
		img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Giovanni Opspor - token estilo Hexatombe.png",
		fallback: "/presets/warrior.png",
		presetIdx: 1,
		color: "from-red-900/60 to-red-950/90 border-red-500/40 text-red-200",
		badgeBg: "bg-red-500/20 text-red-300 border-red-500/30",
	},
	{
		id: "carrara",
		name: "Carrara",
		classLabel: "Especialista",
		subclass: "Infiltrador",
		nex: "NEX 35%",
		pv: 48,
		san: 42,
		pe: 35,
		img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Carrara - token estilo Hexatombe.png",
		fallback: "/presets/rogue.png",
		presetIdx: 2,
		color:
			"from-emerald-900/60 to-emerald-950/90 border-emerald-500/40 text-emerald-200",
		badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
	},
	{
		id: "cleo",
		name: "Cleo",
		classLabel: "Ocultista",
		subclass: "Conduíte",
		nex: "NEX 35%",
		pv: 36,
		san: 58,
		pe: 45,
		img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Cleo - token estilo Hexatombe.png",
		fallback: "/presets/mage.png",
		presetIdx: 3,
		color:
			"from-purple-900/60 to-purple-950/90 border-purple-500/40 text-purple-200",
		badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
	},
	{
		id: "cristino",
		name: "Cristino",
		classLabel: "Combatente",
		subclass: "Guerreiro",
		nex: "NEX 35%",
		pv: 62,
		san: 32,
		pe: 22,
		img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Cristino - token estilo Hexatombe.png",
		fallback: "/presets/warrior.png",
		presetIdx: 4,
		color: "from-red-900/60 to-red-950/90 border-red-500/40 text-red-200",
		badgeBg: "bg-red-500/20 text-red-300 border-red-500/30",
	},
	{
		id: "mosto",
		name: "Mosto",
		classLabel: "Especialista",
		subclass: "Técnico",
		nex: "NEX 30%",
		pv: 44,
		san: 40,
		pe: 30,
		img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Mosto - token estilo Hexatombe.png",
		fallback: "/presets/detective.png",
		presetIdx: 5,
		color:
			"from-emerald-900/60 to-emerald-950/90 border-emerald-500/40 text-emerald-200",
		badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
	},
	{
		id: "nando",
		name: "Nando",
		classLabel: "Combatente",
		subclass: "Tropa de Choque",
		nex: "NEX 30%",
		pv: 70,
		san: 28,
		pe: 18,
		img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Nando - token estilo Hexatombe.png",
		fallback: "/presets/warrior.png",
		presetIdx: 6,
		color: "from-red-900/60 to-red-950/90 border-red-500/40 text-red-200",
		badgeBg: "bg-red-500/20 text-red-300 border-red-500/30",
	},
	{
		id: "tarrafa",
		name: "Tarrafa",
		classLabel: "Ocultista",
		subclass: "Intuitivo",
		nex: "NEX 30%",
		pv: 34,
		san: 60,
		pe: 42,
		img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Tarrafa - token estilo Hexatombe.png",
		fallback: "/presets/cleric.png",
		presetIdx: 7,
		color:
			"from-purple-900/60 to-purple-950/90 border-purple-500/40 text-purple-200",
		badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
	},
	{
		id: "laila",
		name: "Laila Verdante",
		classLabel: "Ocultista",
		subclass: "Lâmina Paranormal",
		nex: "NEX 50%",
		pv: 48,
		san: 50,
		pe: 50,
		img: "/Arquivos secretos/AS6/Extras/AS 06 - Extras v1.0 - Elite/Token-Laila-Verdante-borda.png",
		fallback: "/presets/mage.png",
		presetIdx: 8,
		color:
			"from-purple-900/60 to-purple-950/90 border-purple-500/40 text-purple-200",
		badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
	},
	{
		id: "alice",
		name: "Alice Cruzes",
		classLabel: "Especialista",
		subclass: "Médico de Campo",
		nex: "NEX 45%",
		pv: 54,
		san: 48,
		pe: 38,
		img: "/Arquivos secretos/AS6/Extras/AS 06 - Extras v1.0 - Elite/Token---Alice-Cruzes---borda.png",
		fallback: "/presets/detective.png",
		presetIdx: 9,
		color:
			"from-emerald-900/60 to-emerald-950/90 border-emerald-500/40 text-emerald-200",
		badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
	},
];

export function OrdemAgentGallery({
	setValue,
}: {
	setValue: CharacterSetValue;
}) {
	const handleSelectAgent = async (agent: AgentPresetDef) => {
		const { ORDEM_PRESET_AGENTS } = await import("@/lib/ordem/presets");
		const preset = ORDEM_PRESET_AGENTS[agent.presetIdx];
		if (!preset) return;

		setValue("characterName", preset.characterName ?? "", {
			shouldDirty: true,
			shouldValidate: true,
		});
		setValue("class", preset.class ?? "", { shouldDirty: true });
		setValue("subclass", preset.subclass ?? "", { shouldDirty: true });
		setValue("race", preset.race ?? "", { shouldDirty: true });
		setValue("level", preset.level ?? 8, { shouldDirty: true });
		setValue("health", preset.health ?? 40, { shouldDirty: true });
		setValue("healthMax", preset.healthMax ?? 40, { shouldDirty: true });
		setValue("sanity", preset.sanity ?? 50, { shouldDirty: true });
		setValue("sanityMax", preset.sanityMax ?? 50, { shouldDirty: true });
		setValue("effort", preset.effort ?? 30, { shouldDirty: true });
		setValue("effortMax", preset.effortMax ?? 30, { shouldDirty: true });
		setValue("imageUrl", preset.imageUrl ?? "", { shouldDirty: true });
		setValue("notes", preset.notes ?? "", { shouldDirty: true });
		if (preset.customFields) {
			setValue("systemFields", preset.customFields as Record<string, string>, {
				shouldDirty: true,
			});
		}
		if (preset.spellsList) {
			setValue("spellsList", preset.spellsList, { shouldDirty: true });
		}
		if (preset.featsList) {
			setValue("featsList", preset.featsList, { shouldDirty: true });
		}
	};

	return (
		<div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-4">
			<div className="flex items-center gap-2">
				<UserCheck className="h-5 w-5 text-primary" />
				<div>
					<h3 className="font-display text-sm font-bold text-foreground">
						Catálogo de Agentes Prontos (Arquivos Secretos)
					</h3>
					<p className="text-xs text-muted-foreground">
						Escolha um dos agentes icônicos de Elite para preencher
						automaticamente todos os atributos, perícias e rituais.
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
				{ORDEM_AGENTS.map((agent) => (
					<div
						key={agent.id}
						className={`group relative overflow-hidden rounded-xl border bg-gradient-to-b ${agent.color} p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 flex flex-col justify-between`}
					>
						{/* Portrait Header */}
						<div className="relative mb-2 aspect-[4/3] w-full overflow-hidden rounded-lg bg-black/40 border border-white/10">
							<img
								src={encodeURI(agent.img)}
								alt={agent.name}
								className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
								onError={(e) => {
									(e.target as HTMLImageElement).src = agent.fallback;
								}}
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

							{/* NEX Badge */}
							<span className="absolute top-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 backdrop-blur-md border border-amber-500/30">
								{agent.nex}
							</span>

							{/* Name overlay */}
							<div className="absolute bottom-1.5 left-1.5 right-1.5">
								<div className="font-display text-xs font-bold text-white drop-shadow-md truncate">
									{agent.name}
								</div>
								<div className="text-[9px] text-white/70 truncate">
									{agent.subclass}
								</div>
							</div>
						</div>

						{/* Badges & Stats */}
						<div className="space-y-2 mb-2">
							<div className="flex items-center gap-1">
								<span
									className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${agent.badgeBg}`}
								>
									{agent.classLabel}
								</span>
							</div>

							<div className="grid grid-cols-3 gap-1 rounded bg-black/30 p-1 text-center text-[9px] border border-white/5">
								<div>
									<span className="block text-white/50 text-[8px]">PV</span>
									<span className="font-bold text-red-400">{agent.pv}</span>
								</div>
								<div>
									<span className="block text-white/50 text-[8px]">SAN</span>
									<span className="font-bold text-cyan-300">{agent.san}</span>
								</div>
								<div>
									<span className="block text-white/50 text-[8px]">PE</span>
									<span className="font-bold text-amber-300">{agent.pe}</span>
								</div>
							</div>
						</div>

						{/* Load Button (Accessible touch target >= 44px) */}
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="w-full min-h-[44px] justify-center gap-1.5 text-xs font-bold bg-white/5 hover:bg-white/15 border-white/20 text-white cursor-pointer active:scale-[0.98]"
							onClick={() => handleSelectAgent(agent)}
						>
							<Sparkles className="h-3.5 w-3.5 text-amber-300 shrink-0" />
							Usar este Agente
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
