import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BookOpen,
	Flag,
	Globe2,
	Map as MapIcon,
	Newspaper,
	Package,
	Pencil,
	Users,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useRPGStore } from "@/lib/store";
import {
	useActiveWorld,
	useWorldCampaignsByWorldId,
} from "@/lib/worldbuilding/hooks";

export const Route = createFileRoute("/world")({
	component: WorldHubPage,
});

const worldShortcuts = [
	{
		to: "/npcs",
		label: "NPCs",
		description: "Aliados, inimigos e mistérios",
		Icon: Users,
		accent: "text-fuchsia-300",
	},
	{
		to: "/factions",
		label: "Facções",
		description: "Organizações do Mundo",
		Icon: Flag,
		accent: "text-emerald-300",
	},
	{
		to: "/news",
		label: "Mural",
		description: "Notícias e rumores",
		Icon: Newspaper,
		accent: "text-amber-300",
	},
	{
		to: "/items",
		label: "Itens",
		description: "Tesouros e relíquias",
		Icon: Package,
		accent: "text-sky-300",
	},
	{
		to: "/locations",
		label: "Locais",
		description: "Reinos e fronteiras",
		Icon: MapIcon,
		accent: "text-rose-300",
	},
	{
		to: "/lore",
		label: "Lore",
		description: "História e conhecimento",
		Icon: BookOpen,
		accent: "text-indigo-300",
	},
] as const;

function WorldHubPage() {
	const { user } = useAuth();
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const activeWorld = useActiveWorld();
	const updateWorld = useRPGStore((s) => s.updateWorld);
	const switchCampaign = useRPGStore((s) => s.switchCampaign);
	const worldCampaigns = useWorldCampaignsByWorldId(activeWorld?.id);

	const [isEditingName, setIsEditingName] = useState(false);
	const [draftName, setDraftName] = useState("");
	const nameInputId = useId();

	useEffect(() => {
		if (activeWorld) {
			setDraftName(activeWorld.name);
			setIsEditingName(false);
		}
	}, [activeWorld?.id, activeWorld?.name]);

	const canEditName =
		!!activeWorld && !!user && activeWorld.ownerUserId === user.id;

	function handleSaveName() {
		if (!activeWorld || !canEditName) return;
		const next = draftName.trim();
		if (!next || next === activeWorld.name) {
			setIsEditingName(false);
			setDraftName(activeWorld.name);
			return;
		}
		updateWorld(activeWorld.id, { name: next });
		setIsEditingName(false);
	}

	if (!activeWorld) {
		return (
			<div className="w-full">
				<PageHeader
					title="Mundo"
					description="Escolha um Mundo no seletor da sidebar para ver a visão geral."
					Icon={Globe2}
					iconColor="text-sky-300"
					eyebrow="Worldbuilding"
				/>
				<div className="mx-auto w-full max-w-7xl px-6 pb-10 sm:px-8">
					<EmptyState
						Icon={Globe2}
						title="Nenhum Mundo ativo"
						description="Use o seletor no topo da sidebar para trocar de Mundo ou criar um novo."
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full">
			<PageHeader
				title={activeWorld.name}
				description={
					activeWorld.isDefault
						? "Mundo padrão desta conta — campanhas e grimório compartilhado."
						: "Ambientação compartilhada entre as campanhas desta mesa."
				}
				Icon={Globe2}
				iconColor="text-sky-300"
				eyebrow="Worldbuilding"
				count={worldCampaigns.length}
				action={
					canEditName ? (
						isEditingName ? (
							<form
								className="flex items-center gap-2"
								onSubmit={(e) => {
									e.preventDefault();
									handleSaveName();
								}}
							>
								<label htmlFor={nameInputId} className="sr-only">
									Nome do Mundo
								</label>
								<Input
									id={nameInputId}
									value={draftName}
									onChange={(e) => setDraftName(e.target.value)}
									className="w-48 sm:w-56"
									autoFocus
								/>
								<Button type="submit" size="sm" disabled={!draftName.trim()}>
									Salvar
								</Button>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={() => {
										setIsEditingName(false);
										setDraftName(activeWorld.name);
									}}
								>
									Cancelar
								</Button>
							</form>
						) : (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setIsEditingName(true)}
								className="gap-1.5"
							>
								<Pencil className="h-3.5 w-3.5" />
								Renomear
							</Button>
						)
					) : undefined
				}
			/>

			<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-10 sm:px-8">
				<section className="space-y-3">
					<div>
						<h2 className="font-display text-lg font-bold tracking-tight">
							Campanhas neste Mundo
						</h2>
						<p className="mt-1 text-[13px] text-muted-foreground">
							Mesas que compartilham o grimório, facções e mural.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{worldCampaigns.map((campaign) => {
							const isActive = campaign.id === activeCampaignId;
							return (
								<button
									key={campaign.id}
									type="button"
									onClick={() => {
										if (!isActive) void switchCampaign(campaign.id);
									}}
									className={`rounded-2xl border px-4 py-3.5 text-left transition-colors ${
										isActive
											? "border-primary/30 bg-primary/10"
											: "border-border/60 bg-card/60 hover:border-primary/20 hover:bg-muted/40"
									}`}
								>
									<div className="flex items-center justify-between gap-2">
										<span className="truncate text-[13px] font-semibold">
											{campaign.name}
										</span>
										{isActive && (
											<span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary">
												Ativa
											</span>
										)}
									</div>
									{campaign.description ? (
										<p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
											{campaign.description}
										</p>
									) : null}
								</button>
							);
						})}
					</div>
					{worldCampaigns.length === 0 && (
						<p className="text-[12px] text-muted-foreground">
							Nenhuma campanha listada neste Mundo.
						</p>
					)}
				</section>

				<section className="space-y-3">
					<div>
						<h2 className="font-display text-lg font-bold tracking-tight">
							Grimório e Worldbuilding
						</h2>
						<p className="mt-1 text-[13px] text-muted-foreground">
							Atalhos para o conteúdo compartilhado do Mundo.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{worldShortcuts.map(({ to, label, description, Icon, accent }) => (
							<Link
								key={to}
								to={to}
								className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3.5 transition-colors hover:border-primary/25 hover:bg-muted/40"
							>
								<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/60">
									<Icon className={`h-4 w-4 ${accent}`} strokeWidth={1.8} />
								</div>
								<div className="min-w-0">
									<span className="block text-[13px] font-semibold group-hover:text-primary">
										{label}
									</span>
									<span className="mt-0.5 block text-[11px] text-muted-foreground">
										{description}
									</span>
								</div>
							</Link>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
