import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, LockKeyhole } from "lucide-react";
import {
	ArquivosSecretosHub,
	type ArquivosSecretosTab,
} from "@/components/ordem/arquivos-secretos-hub";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { useActiveCampaign } from "@/lib/store";
import { cn } from "@/lib/utils";

const VALID_TABS: ArquivosSecretosTab[] = [
	"suplementos",
	"tokens",
	"mapas",
	"audio",
	"bestiario",
];

export const Route = createFileRoute("/arquivos-secretos")({
	validateSearch: (
		search: Record<string, unknown>,
	): { tab: ArquivosSecretosTab } => {
		const tab = search.tab;
		return {
			tab:
				typeof tab === "string" &&
				VALID_TABS.includes(tab as ArquivosSecretosTab)
					? (tab as ArquivosSecretosTab)
					: "suplementos",
		};
	},
	component: ArquivosSecretosPage,
});

function ArquivosSecretosPage() {
	const { tab } = Route.useSearch();
	const activeCampaign = useActiveCampaign();
	const isOrdemCampaign = activeCampaign?.system === "ordem";

	return (
		<div className="container mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
			<PageHeader
				title="Arquivos Secretos (AS1 - AS7)"
				description="Biblioteca de suplementos, HQs, mapas de batalha, trilhas sonoras e tokens de Ordem Paranormal RPG."
				Icon={Archive}
				eyebrow="Ordem Paranormal"
			/>
			{isOrdemCampaign ? (
				<ArquivosSecretosHub initialTab={tab} />
			) : (
				<div className="mx-auto max-w-2xl rounded-2xl border border-border/70 bg-card-elevated p-6 text-center shadow-sm">
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-muted-foreground/20 bg-muted/35 text-muted-foreground">
						<LockKeyhole className="h-5 w-5" />
					</div>
					<h2 className="font-display mt-4 text-lg font-bold text-foreground">
						Central disponível apenas em campanhas de Ordem Paranormal
					</h2>
					<p className="mt-2 text-[13px] leading-6 text-muted-foreground">
						Altere o sistema da campanha ativa para Ordem Paranormal nas
						configurações da mesa para acessar os Arquivos Secretos.
					</p>
					<Link
						to="/dashboard"
						className={cn(
							buttonVariants({ variant: "outline", size: "sm" }),
							"mt-5",
						)}
					>
						Voltar ao dashboard
					</Link>
				</div>
			)}
		</div>
	);
}
