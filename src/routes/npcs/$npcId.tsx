import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle2,
	FileText,
	HeartPulse,
	MapPin,
	Pencil,
	Shield,
	Skull,
	Sparkles,
	User,
	Users,
} from "lucide-react";
import { type ComponentType, type ReactNode, useState } from "react";
import { EntityLinkChips } from "@/components/entity-links";
import { NpcEditButton } from "@/components/npc-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/npcs/$npcId")({
	validateSearch: (search: Record<string, unknown>) => ({
		edit: search.edit === true || search.edit === "true",
	}),
	component: NpcDetailPage,
});

const statSkeletonKeys = ["status", "disposition", "importance", "cr"];
const detailSkeletonKeys = ["identity", "description", "stats"];

const dispositionStyles: Record<string, { label: string; tone: string }> = {
	hostile: {
		label: "Hostil",
		tone: "border-rose-500/25 bg-rose-500/10 text-rose-200",
	},
	unfriendly: {
		label: "Antipatico",
		tone: "border-orange-500/25 bg-orange-500/10 text-orange-200",
	},
	neutral: {
		label: "Neutro",
		tone: "border-border/70 bg-background/45 text-muted-foreground",
	},
	friendly: {
		label: "Amigavel",
		tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
	},
	ally: {
		label: "Aliado",
		tone: "border-sky-500/25 bg-sky-500/10 text-sky-200",
	},
};

const importanceLabels: Record<string, string> = {
	minor: "Figurante",
	supporting: "Coadjuvante",
	major: "Importante",
	boss: "Vilao / Chefe",
	unknown: "Desconhecida",
};

function NpcDetailPage() {
	const { npcId } = Route.useParams();
	const { edit } = Route.useSearch();
	const navigate = useNavigate();
	const npc = useRPGStore((state) =>
		state.npcs.find((item) => item.id === npcId),
	);
	const isLoading = useRPGStore((state) => state.isLoadingRemote);
	const linkedCharacter = useRPGStore((state) =>
		npc?.linkedCharacterId
			? state.characters.find(
					(character) => character.id === npc.linkedCharacterId,
				)
			: undefined,
	);
	const [isEditing, setIsEditing] = useState(edit || false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

	if (isLoading) return <NpcDetailSkeleton />;

	if (!npc) {
		return (
			<div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
				<Users className="h-16 w-16 text-muted-foreground/30" />
				<div>
					<h2 className="font-display text-lg font-bold text-foreground">
						NPC ou monstro nao encontrado
					</h2>
					<p className="mt-1 text-[13px] text-muted-foreground">
						Esse registro pode ter sido removido ou ainda nao sincronizou.
					</p>
				</div>
				<Link to="/npcs">
					<Button variant="outline" size="sm">
						<ArrowLeft className="h-3.5 w-3.5" />
						Voltar para NPCs
					</Button>
				</Link>
			</div>
		);
	}

	const currentNpc = npc;
	const isMonster = currentNpc.kind === "monster";
	const kindLabel = isMonster ? "Monstro" : "NPC";
	const HeroIcon = isMonster ? Skull : User;
	const disposition =
		dispositionStyles[currentNpc.disposition] ?? dispositionStyles.neutral;
	const subtitle = [
		currentNpc.race || kindLabel,
		currentNpc.role,
		currentNpc.location,
	]
		.filter(Boolean)
		.join(" · ");

	function handleDialogOpenChange(open: boolean) {
		setDialogOpen(open);
		if (!open && edit) {
			void navigate({
				to: "/npcs/$npcId",
				params: { npcId: currentNpc.id },
				search: { edit: false },
				replace: true,
			});
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 sm:px-8">
			<header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-6 shadow-xl shadow-black/5">
				<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="min-w-0">
						<Link
							to="/npcs"
							className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-primary"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							Voltar para NPCs & Monstros
						</Link>
						<div className="mt-4 flex items-start gap-4">
							<div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-fuchsia-500/10 ring-1 ring-fuchsia-500/20">
								{npc.imageUrl ? (
									<img
										src={npc.imageUrl}
										alt={npc.name}
										className="h-full w-full object-cover"
									/>
								) : (
									<HeroIcon
										className="h-7 w-7 text-fuchsia-300/60"
										strokeWidth={1.4}
									/>
								)}
								{!npc.isAlive && (
									<Skull className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-card p-0.5 text-rose-400 ring-1 ring-border" />
								)}
							</div>
							<div className="min-w-0">
								<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
									<HeroIcon className="h-3.5 w-3.5" />
									{kindLabel}
								</div>
								<h1 className="font-display mt-3 truncate text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
									{npc.name || "Sem nome"}
								</h1>
								<p className="mt-2 text-[13px] text-muted-foreground">
									{subtitle || "Registro do mestre"}
								</p>
							</div>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{linkedCharacter && (
							<Link
								to="/sheets/$characterId"
								params={{ characterId: linkedCharacter.id }}
							>
								<Button type="button" variant="outline" className="gap-2">
									<FileText className="h-4 w-4" />
									Ficha vinculada
								</Button>
							</Link>
						)}
						<Button
							type="button"
							onClick={() => setIsEditing((current) => !current)}
							className="gap-2"
						>
							<Pencil className="h-4 w-4" />
							{isEditing ? "Concluir edição" : "Editar"}
						</Button>
					</div>
				</div>

				<div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
					<QuickStat
						Icon={npc.isAlive ? CheckCircle2 : Skull}
						label="Status"
						value={npc.isAlive ? "Vivo" : "Morto"}
						color={npc.isAlive ? "text-emerald-300" : "text-rose-300"}
					/>
					<QuickStat
						Icon={HeartPulse}
						label="Disposicao"
						value={disposition.label}
						color="text-fuchsia-300"
					/>
					<QuickStat
						Icon={Sparkles}
						label="Importancia"
						value={importanceLabels[npc.importance] ?? npc.importance}
						color="text-primary"
					/>
					<QuickStat
						Icon={Shield}
						label="CR / Nivel"
						value={npc.cr || "-"}
						color="text-amber-300"
					/>
				</div>
			</header>

			<div className="grid gap-5 lg:grid-cols-[1fr_340px]">
				<main className="grid content-start gap-5">
					<SectionCard
						eyebrow="Resumo"
						title="Identidade"
						onEdit={isEditing ? () => { setActiveTab("basic"); setDialogOpen(true); } : undefined}
					>
						<div className="grid gap-3 sm:grid-cols-2">
							<InfoRow label="Tipo" value={kindLabel} />
							<InfoRow label="Raca" value={npc.race || "Nao informada"} />
							<InfoRow label="Papel" value={npc.role || "Nao informado"} />
							<InfoRow
								label="Tendencia"
								value={npc.alignment || "Nao informada"}
							/>
							<InfoRow label="Faccao" value={npc.faction || "Nenhuma"} />
							<InfoRow
								label="Localizacao"
								value={npc.location || "Nao informada"}
								Icon={MapPin}
							/>
						</div>
					</SectionCard>

					<SectionCard
						eyebrow="Narrativa"
						title="Descricao"
						onEdit={isEditing ? () => { setActiveTab("basic"); setDialogOpen(true); } : undefined}
					>
						<TextBlock value={npc.description} />
					</SectionCard>

					<SectionCard
						eyebrow="Mesa"
						title="Personalidade & Aparencia"
						onEdit={isEditing ? () => { setActiveTab("personality"); setDialogOpen(true); } : undefined}
					>
						<div className="grid gap-3">
							<TextBlock title="Aparencia" value={npc.appearance} />
							<TextBlock title="Tiques / Maneirismos" value={npc.mannerisms} />
							<TextBlock title="Motivacoes" value={npc.motivations} />
							<TextBlock title="Relacionamentos" value={npc.relationships} />
						</div>
					</SectionCard>

					{npc.stats && (
						<SectionCard
							eyebrow="Combate"
							title="Stats"
							onEdit={isEditing ? () => { setActiveTab("stats"); setDialogOpen(true); } : undefined}
						>
							<pre className="whitespace-pre-wrap rounded-2xl border border-border/70 bg-background/45 p-4 font-mono text-[12px] leading-relaxed text-foreground/90">
								{npc.stats}
							</pre>
						</SectionCard>
					)}
				</main>

				<aside className="grid content-start gap-5">
					<SectionCard
						eyebrow="Estado"
						title="Mesa"
						onEdit={isEditing ? () => { setActiveTab("basic"); setDialogOpen(true); } : undefined}
					>
						<div className="grid gap-3">
							<div
								className={cn(
									"rounded-2xl border px-4 py-3 text-[12px] font-bold",
									disposition.tone,
								)}
							>
								{disposition.label}
							</div>
							<InfoRow
								label="Importancia"
								value={importanceLabels[npc.importance] ?? npc.importance}
							/>
							<InfoRow label="CR / Nivel" value={npc.cr || "-"} />
						</div>
					</SectionCard>

					<SectionCard eyebrow="Conexoes" title="Vinculos">
						<EntityLinkChips
							links={npc.entityLinks}
							emptyText="Nenhuma conexao registrada."
						/>
						{linkedCharacter && (
							<Link
								to="/sheets/$characterId"
								params={{ characterId: linkedCharacter.id }}
								className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] font-bold text-primary transition-colors hover:bg-primary/15"
							>
								<FileText className="h-3.5 w-3.5" />
								{linkedCharacter.characterName || "Ficha sem nome"}
							</Link>
						)}
					</SectionCard>

					<SectionCard
						eyebrow="Mestre"
						title="Segredos"
						onEdit={isEditing ? () => { setActiveTab("secrets"); setDialogOpen(true); } : undefined}
					>
						<TextBlock value={npc.secrets} />
					</SectionCard>
				</aside>
			</div>

			<NpcEditButton
				npc={npc}
				open={dialogOpen}
				onOpenChange={handleDialogOpenChange}
				defaultTab={activeTab}
				trigger={null}
			/>
		</div>
	);
}

function NpcDetailSkeleton() {
	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 sm:px-8">
			<div className="rounded-[1.75rem] border border-border/70 bg-card/60 p-6">
				<div className="flex items-start gap-4">
					<Skeleton className="h-16 w-16 rounded-2xl" />
					<div className="flex-1 space-y-3">
						<Skeleton className="h-4 w-32 rounded-full" />
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-48" />
					</div>
					<Skeleton className="h-10 w-24 rounded-lg" />
				</div>
				<div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
					{statSkeletonKeys.map((key) => (
						<Skeleton key={key} className="h-16 rounded-2xl" />
					))}
				</div>
			</div>
			<div className="grid gap-5 lg:grid-cols-[1fr_340px]">
				{detailSkeletonKeys.map((key) => (
					<Skeleton key={key} className="h-44 rounded-2xl" />
				))}
			</div>
		</div>
	);
}

function SectionCard({
	eyebrow,
	title,
	children,
	onEdit,
}: {
	eyebrow: string;
	title: string;
	children: ReactNode;
	onEdit?: () => void;
}) {
	return (
		<section className="relative rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary">
						{eyebrow}
					</p>
					<h2 className="font-display mt-1 text-xl font-bold text-foreground">
						{title}
					</h2>
				</div>
				{onEdit && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onEdit}
						className="gap-1.5"
					>
						<Pencil className="h-3.5 w-3.5" />
						Editar
					</Button>
				)}
			</div>
			<div className="mt-4">{children}</div>
		</section>
	);
}

function QuickStat({
	Icon,
	label,
	value,
	color,
}: {
	Icon: ComponentType<{ className?: string }>;
	label: string;
	value: string;
	color: string;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 px-4 py-3">
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<p className={cn("truncate font-display text-lg font-bold", color)}>
						{value}
					</p>
					<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
						{label}
					</p>
				</div>
				<Icon className={cn("h-4 w-4 shrink-0", color)} />
			</div>
		</div>
	);
}

function InfoRow({
	label,
	value,
	Icon,
}: {
	label: string;
	value: string;
	Icon?: ComponentType<{ className?: string }>;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 p-3">
			<div className="flex items-center gap-1.5">
				{Icon && <Icon className="h-3 w-3 text-primary" />}
				<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
					{label}
				</p>
			</div>
			<p className="mt-1 text-[13px] font-semibold text-foreground">{value}</p>
		</div>
	);
}

function TextBlock({ title, value }: { title?: string; value?: string }) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 p-4">
			{title && (
				<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
					{title}
				</p>
			)}
			<p
				className={cn(
					"whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90",
					title && "mt-2",
				)}
			>
				{value || "Nada registrado ainda."}
			</p>
		</div>
	);
}
