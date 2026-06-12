import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useRPGStore } from "@/lib/store";

export const Route = createFileRoute("/templates/$templateId")({
	component: TemplateDetailPage,
});

function TemplateDetailPage() {
	const { templateId } = Route.useParams();
	const template = useRPGStore((state) =>
		state.customTemplates.find((item) => item.id === templateId),
	);

	if (!template) {
		return (
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 sm:px-8">
				<Link to="/templates">
					<Button variant="ghost" size="sm" className="gap-2">
						<ArrowLeft className="h-4 w-4" />
						Voltar para templates
					</Button>
				</Link>
				<EmptyState
					Icon={LayoutTemplate}
					title="Template não encontrado"
					description="Esse template pode ter sido removido ou ainda não sincronizou."
				/>
			</div>
		);
	}

	return (
		<div className="w-full">
			<PageHeader
				title={template.name}
				description={template.description || "Template customizado de ficha."}
				Icon={LayoutTemplate}
				iconColor="text-violet-300"
				eyebrow="Template"
				count={template.sections.length}
				action={
					<Link to="/templates">
						<Button variant="outline" size="sm" className="gap-2">
							<ArrowLeft className="h-4 w-4" />
							Voltar
						</Button>
					</Link>
				}
			/>

			<div className="mx-auto grid w-full max-w-7xl gap-5 px-6 pb-10 sm:px-8">
				{template.sections.map((section) => (
					<section
						key={section.id}
						className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5"
					>
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
									Seção
								</p>
								<h2 className="font-display mt-1 text-xl font-bold text-foreground">
									{section.title}
								</h2>
							</div>
							<span className="rounded-full border border-border/70 bg-background/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
								{section.fields.length} campo(s)
							</span>
						</div>
						<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{section.fields.map((field) => (
								<div
									key={field.id}
									className="rounded-xl border border-border/70 bg-background/45 p-3"
								>
									<p className="text-[12px] font-bold text-foreground">
										{field.label}
									</p>
									<p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
										{field.type} · {field.width ?? "full"}
									</p>
								</div>
							))}
						</div>
					</section>
				))}
			</div>
		</div>
	);
}
