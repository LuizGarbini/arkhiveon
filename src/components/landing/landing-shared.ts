import { Map, Users, Zap } from "lucide-react";

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
		Icon: Map,
		eyebrow: "Mesa",
		title: "Tudo volta para o mesmo lugar.",
		description:
			"Nada de procurar anotação perdida quando a sessão já começou.",
	},
	{
		Icon: Zap,
		eyebrow: "Ritmo",
		title: "Menos ruído entre uma ideia e outra.",
		description: "A interface fica quieta para a campanha aparecer primeiro.",
	},
	{
		Icon: Users,
		eyebrow: "Arquivo",
		title: "Um mundo cresce sem virar bagunça.",
		description: "Personagens, lugares e sessões conectados por contexto.",
	},
];

export const freePlanFeatures = [
	"20 registros de campanha",
	"Personagens e sessões essenciais",
	"Backup manual do arquivo",
];

export const proPlanFeatures = [
	"Campanhas sem limite prático",
	"Fichas avançadas e módulos extras",
	"Organização visual para mesas longas",
];

export const howItWorksSteps = [
	{
		step: 1,
		title: "Crie sua campanha",
		description:
			"Um arquivo central para a mesa — nome, sistema e contexto em um só lugar.",
		benefit: "Tudo volta para o mesmo lugar.",
	},
	{
		step: 2,
		title: "Conecte personagens, NPCs e sessões",
		description:
			"Cada entidade lembra de onde veio e com quem se cruza na narrativa.",
		benefit: "Um mundo cresce sem virar bagunça.",
	},
	{
		step: 3,
		title: "Retome de onde parou",
		description:
			"Recaps, ganchos e notas da última sessão prontos quando a mesa volta.",
		benefit: "Menos ruído entre uma ideia e outra.",
	},
];

export const longFormPricingCopy = {
	headline: "Para mesas que não param na sessão 3.",
	subline:
		"Free para testar o fluxo. Pro para campanhas que atravessam meses — com fichas, vínculos e histórico intactos.",
	freeDescription: "Ideal para one-shots e primeiras campanhas.",
	proDescription:
		"Para mestres long-form: mundos grandes, muitas sessões, zero limite na mesa.",
};
