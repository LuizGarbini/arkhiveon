import { Link, useNavigate } from "@tanstack/react-router";
import { Compass, Eye, Mountain, Users } from "lucide-react";
import type { GameLocation } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { EntityActions } from "./entity-actions";
import { cardInitials, EntityCardMedia } from "./entity-card-media";
import { EntityImageViewer } from "./images/entity-image-viewer";

interface LocationCardProps {
	location?: GameLocation;
	isLoading?: boolean;
}

const dangerStyles: Record<string, { tone: string; border: string }> = {
	seguro: { tone: "text-emerald-300", border: "border-emerald-500/35" },
	baixo: { tone: "text-emerald-300", border: "border-emerald-500/20" },
	moderado: { tone: "text-amber-300", border: "border-amber-500/35" },
	medio: { tone: "text-amber-300", border: "border-amber-500/35" },
	alto: { tone: "text-orange-300", border: "border-orange-500/35" },
	mortal: { tone: "text-rose-300", border: "border-rose-500/40" },
	extremo: { tone: "text-rose-300", border: "border-rose-500/40" },
};

export function LocationCard({ location, isLoading }: LocationCardProps) {
	const removeLocation = useRPGStore((s) => s.removeLocation);
	const navigate = useNavigate();

	if (isLoading || !location) {
		return (
			<div className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card-elevated p-5 shadow-sm animate-pulse">
				<div className="space-y-2.5 pt-1">
					<div className="h-5 w-1/2 rounded-md bg-white/10" />
					<div className="h-3 w-1/3 rounded-md bg-white/5" />
				</div>
				<div className="space-y-3 border-t border-white/5 pt-4">
					<div className="h-4 w-1/4 rounded bg-white/10" />
					<div className="h-8 w-full rounded-full bg-white/10" />
				</div>
			</div>
		);
	}

	const dangerKey = (location.dangerLevel || "baixo")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
	const danger = dangerStyles[dangerKey] ?? dangerStyles.baixo;

	return (
		<div className="group relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl border bg-black/40 shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 active:scale-[0.985] active:translate-y-0 border-border/70 hover:border-primary/35">
			{/* Accessible anchor covering the entire card background */}
			<Link
				to="/locations/$locationId"
				params={{ locationId: location.id }}
				search={{ edit: false }}
				className="absolute inset-0 z-0 cursor-pointer"
				aria-label={`Abrir local ${location.name}`}
			/>

			<EntityCardMedia
				src={location.imageUrl}
				alt={location.name}
				icon={Compass}
				accentClassName="from-emerald-500/15 text-emerald-400/40"
				initials={cardInitials(location.name || "L")}
			/>

			{/* Card Content */}
			<div className="relative z-10 pointer-events-none flex h-full flex-col justify-between">
				<div className="pointer-events-auto">
					<EntityActions
						onEdit={() =>
							void navigate({
								to: "/locations/$locationId",
								params: { locationId: location.id },
								search: { edit: true },
							})
						}
						onDelete={() => removeLocation(location.id)}
						entityName={location.name || "Sem nome"}
						entityKindLabel="local"
						worldStaffOnly
						extraActions={
							<EntityImageViewer
								variant="corner"
								src={location.imageUrl || undefined}
								name={location.name || "Sem nome"}
							/>
						}
					/>
				</div>

				<div className="p-4.5 pt-5">
					<h3 className="font-display truncate text-xl font-bold tracking-tight text-white drop-shadow-sm">
						{location.name || "Sem nome"}
					</h3>
					<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/70 font-medium">
						{location.type && <span>{location.type}</span>}
						{location.region && (
							<>
								<span className="opacity-55">·</span>
								<span>{location.region}</span>
							</>
						)}
					</div>
					<div className="mt-2.5 flex flex-wrap items-center gap-1.5">
						<span
							className={`rounded bg-background/50 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${danger.border} ${danger.tone}`}
						>
							perigo {location.dangerLevel || "baixo"}
						</span>
						{location.visited && (
							<span className="flex items-center gap-0.5 rounded bg-primary/20 border border-primary/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
								<Eye className="h-2.5 w-2.5" /> visitado
							</span>
						)}
					</div>
				</div>

				<div className="space-y-3.5 p-4.5 pb-5">
					<div className="grid grid-cols-2 gap-1.5 text-xs">
						{location.climate && (
							<MiniInfo
								Icon={Mountain}
								label="Clima"
								value={location.climate}
							/>
						)}
						{location.population && (
							<MiniInfo
								Icon={Users}
								label="População"
								value={location.population}
							/>
						)}
					</div>

					{location.description && (
						<p className="line-clamp-2 border-t border-white/10 pt-3 text-xs italic leading-relaxed text-white/60">
							“{location.description}”
						</p>
					)}
				</div>
			</div>
		</div>
	);
}

interface MiniInfoProps {
	Icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
}

function MiniInfo({ Icon, label, value }: MiniInfoProps) {
	return (
		<div className="flex items-center gap-1.5 rounded-xl bg-black/45 px-1.5 py-1 border border-white/10">
			<Icon className="h-3.5 w-3.5 shrink-0 text-white/50" />
			<div className="min-w-0">
				<div className="text-[7px] uppercase tracking-wider text-white/50 font-bold leading-none">
					{label}
				</div>
				<div className="truncate text-[10px] font-bold text-white leading-tight mt-0.5">
					{value}
				</div>
			</div>
		</div>
	);
}
