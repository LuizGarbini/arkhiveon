import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, FileJson, LayoutTemplate, Download } from "lucide-react";
import { useRef } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useRPGStore } from "@/lib/store";
import type { CustomTemplate } from "@/lib/store/types";

export const Route = createFileRoute("/templates/")(
	{
	component: TemplatesIndexPage,
});

function TemplatesIndexPage() {
	const templates = useRPGStore((state) => state.customTemplates || []);
	const addTemplate = useRPGStore((state) => state.addTemplate);
	const fileInputRef = useRef<HTMLInputElement>(null);

	function handleExport(template: CustomTemplate) {
		const data = JSON.stringify(template, null, 2);
		const blob = new Blob([data], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${template.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_template.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const content = e.target?.result as string;
				const template = JSON.parse(content) as CustomTemplate;
				if (!template.id || !template.name || !template.sections) {
					throw new Error("Formato inválido");
				}
				// Generate new ID to avoid collisions
				const newTemplate = {
					...template,
					id: `custom_${Math.random().toString(36).substr(2, 9)}`,
					name: `${template.name} (Importado)`,
				};
				addTemplate(newTemplate);
			} catch (error) {
				alert("Falha ao importar o template. Verifique se o arquivo é válido.");
			}
		};
		reader.readAsText(file);
		// Reset input so the same file can be imported again
		event.target.value = "";
	}

	return (
		<div className="w-full">
			<PageHeader
				title="Templates"
				description="Crie fichas de RPG totalmente do zero ou importe templates criados por outras pessoas."
				Icon={LayoutTemplate}
				iconColor="text-violet-300"
				eyebrow="Construtor"
				count={templates.length}
				action={
					<div className="flex items-center gap-3">
						<input
							type="file"
							accept="application/json"
							className="hidden"
							ref={fileInputRef}
							onChange={handleImport}
						/>
						<Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
							<FileJson className="h-3.5 w-3.5" />
							Importar
						</Button>
						<Link to="/templates/new">
							<Button size="sm" className="gap-2">
								<Plus className="h-3.5 w-3.5" />
								Criar do zero
							</Button>
						</Link>
					</div>
				}
			/>

			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 pb-10 sm:px-8">
				{templates.length === 0 ? (
					<EmptyState
						Icon={LayoutTemplate}
						title="Nenhum template criado"
						description="Você ainda não possui templates customizados. Crie um do zero usando o construtor arrastar-e-soltar."
					/>
				) : (
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{templates.map((template) => (
							<div
								key={template.id}
								className="group relative flex flex-col overflow-hidden rounded-[24px] border border-border/60 bg-card/60 p-5 shadow-sm shadow-black/5 transition-all hover:border-primary/40 hover:bg-card/90"
							>
								<div className="mb-4 flex items-center justify-between">
									<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
										<LayoutTemplate className="h-6 w-6" />
									</div>
								</div>
								<h3 className="font-display text-xl font-bold text-foreground">
									{template.name}
								</h3>
								<p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
									{template.description || "Sem descrição"}
								</p>
								<div className="mt-auto flex items-center gap-2 pt-6">
									<Link to={`/templates/${template.id}`} className="flex-1">
										<Button variant="secondary" className="w-full">
											Editar template
										</Button>
									</Link>
									<Button variant="outline" size="icon" onClick={() => handleExport(template)} title="Exportar">
										<Download className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
