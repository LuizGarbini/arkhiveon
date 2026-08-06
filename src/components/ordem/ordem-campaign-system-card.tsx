import { CheckCircle2, type LucideIcon } from "lucide-react";

interface OrdemCampaignSystemCardProps {
	title: string;
	badge: string;
	description: string;
	Icon: LucideIcon;
	isSelected: boolean;
	onSelect: () => void;
}

export function OrdemCampaignSystemCard({
	title,
	badge,
	description,
	Icon,
	isSelected,
	onSelect,
}: OrdemCampaignSystemCardProps) {
	return (
		<button
			type="button"
			aria-pressed={isSelected}
			onClick={onSelect}
			className={`group relative overflow-hidden rounded-xl border p-3 text-left text-white shadow-sm transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.985] ${
				isSelected
					? "border-rose-300/80 shadow-[0_22px_48px_-30px_rgba(244,63,94,0.95)]"
					: "border-rose-500/35 shadow-[0_18px_44px_-34px_rgba(244,63,94,0.85)] hover:border-rose-400/65"
			} bg-[radial-gradient(circle_at_top_right,rgba(225,29,72,0.22),transparent_36%),linear-gradient(135deg,rgba(24,24,27,0.92),rgba(76,5,25,0.72))]`}
		>
			<div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-rose-300/80 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-300/30 bg-rose-500/15 text-rose-100">
						<Icon className="h-4.5 w-4.5" strokeWidth={1.7} />
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h3 className="font-display text-[13px] font-bold text-white">
								{title}
							</h3>
							<span className="rounded-full border border-rose-200/25 bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-rose-100">
								{badge}
							</span>
						</div>
						<p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-rose-50/72">
							{description}
						</p>
					</div>
				</div>

				{isSelected ? (
					<CheckCircle2 className="h-4 w-4 shrink-0 text-rose-100" />
				) : null}
			</div>
		</button>
	);
}
