import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/consumo")({
	component: ConsumoRoute,
});

function ConsumoRoute() {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-8">
			<h1 className="font-display text-2xl font-bold text-foreground">
				Consumo
			</h1>
			<p className="text-sm text-muted-foreground">
				O detalhamento do armazenamento entra na próxima etapa. O card da barra
				lateral já mostra o uso total da cota.
			</p>
		</div>
	);
}
