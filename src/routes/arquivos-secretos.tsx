import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { ArquivosSecretosHub } from "@/components/ordem/arquivos-secretos-hub";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/arquivos-secretos")({
	component: ArquivosSecretosPage,
});

function ArquivosSecretosPage() {
	return (
		<div className="w-full">
			<PageHeader
				Icon={BookOpen}
				iconColor="text-indigo-300"
				title="Arquivos Secretos (AS1 - AS7)"
				description="Biblioteca de suplementos, HQs, mapas de batalha, trilhas sonoras e tokens de Ordem Paranormal RPG"
				eyebrow="Ordem Paranormal"
			/>
			<div className="px-6 pb-10 sm:px-8">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
					<ArquivosSecretosHub />
				</div>
			</div>
		</div>
	);
}
