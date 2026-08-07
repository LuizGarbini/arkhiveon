import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { ArquivosSecretosHub } from "@/components/ordem/arquivos-secretos-hub";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/arquivos-secretos")({
	component: ArquivosSecretosPage,
});

function ArquivosSecretosPage() {
	return (
		<div className="container mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
			<PageHeader
				Icon={BookOpen}
				title="Arquivos Secretos (AS1 - AS7)"
				description="Biblioteca de suplementos, HQs, mapas de batalha, trilhas sonoras e tokens de Ordem Paranormal RPG."
			/>
			<ArquivosSecretosHub />
		</div>
	);
}
