import { Globe2, ScrollText, Swords } from "lucide-react";

export const LANDING_VARIANTS = ["A", "B", "C"] as const;
export type LandingVariant = (typeof LANDING_VARIANTS)[number];

export const LANDING_VARIANT_LABELS: Record<
	LandingVariant,
	{ key: LandingVariant; name: string }
> = {
	A: { key: "A", name: "Baseline" },
	B: { key: "B", name: "Product Demo" },
	C: { key: "C", name: "Steps First" },
};

export function isLandingVariant(value: unknown): value is LandingVariant {
	return (
		typeof value === "string" &&
		LANDING_VARIANTS.includes(value as LandingVariant)
	);
}

export type LandingVariantProps = {
	loading: boolean;
	isAuthenticated: boolean;
};

export const pillars = [
	{
		Icon: Swords,
		eyebrow: "01 · Mesa Virtual & VTT",
		title: "Mapa tático, tokens e dados na mesma janela.",
		description:
			"Mova tokens a 60fps, meça alcances com a régua, dispare pings sonoros e projete áreas de magia sem abrir três abas diferentes.",
		meta: "Sincronização em tempo real · Áudio & Spotify Jam",
	},
	{
		Icon: ScrollText,
		eyebrow: "02 · Fichas & Sistemas",
		title: "D&D 5e, Ordem Paranormal ou o seu próprio sistema.",
		description:
			"Fichas modulares com inventário, grimório de magias, perícias automáticas e exportação para PDF prontas para jogar.",
		meta: "Modificador automático · Rolagem integrada",
	},
	{
		Icon: Globe2,
		eyebrow: "03 · Mundo & Crônica",
		title: "Cada NPC, facção e sessão sabe onde pertence.",
		description:
			"Construa árvores genealógicas, relacione facções, controle o que é segredo do mestre e consulte a IA da Mesa com contexto real da campanha.",
		meta: "Visibilidade Mestre/Jogador · IA contextual",
	},
];

export const freePlanFeatures = [
	"1 Mundo e 1 campanha ativa",
	"Até 20 registros (personagens, NPCs, locais, itens e lore)",
	"Fichas completas e acesso ao VTT em tempo real",
	"Jogadores entram de graça em mesas de um Mestre Pro",
];

export const proPlanFeatures = [
	"Até 5 Mundos e 5 campanhas por Mundo",
	"Registros ilimitados de personagens, NPCs, itens, locais e lore",
	"Um único Pro cobre a mesa inteira — seus jogadores não pagam nada",
	"IA da Mesa contextual, Árvore de Relações e galeria de mapas expandida",
];

export const howItWorksSteps = [
	{
		step: 1,
		title: "Crie seu Mundo e abra a campanha",
		description:
			"Escolha entre D&D 5e, Ordem Paranormal ou blocos customizados e convide os jogadores por link.",
		benefit: "Pronto em menos de 1 minuto.",
	},
	{
		step: 2,
		title: "Prepare fichas, mapas e segredos",
		description:
			"Cadastre NPCs, facções e cenas do VTT decidindo com um clique o que é público e o que é só do Mestre.",
		benefit: "Zero spoiler acidental.",
	},
	{
		step: 3,
		title: "Conduza a sessão ao vivo",
		description:
			"Abra o VTT, solte a trilha no Spotify Jam e deixe o histórico de sessões registrado para a próxima semana.",
		benefit: "Tudo salvo para a próxima sessão.",
	},
];

export const longFormPricingCopy = {
	headline: "Comece de graça. Escale quando a campanha pedir.",
	subline:
		"Apenas o Mestre precisa assinar o Pro para desbloquear recursos ilimitados para todos os jogadores convidados da mesa.",
	freeDescription: "Para testar o fluxo ou rodar uma aventura curta.",
	proDescription:
		"Para mestres de campanhas longas: múltiplos mundos, criações sem teto e toda a mesa coberta.",
};
