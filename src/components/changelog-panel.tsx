import { Calendar, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CHANGELOG_DATA } from "@/data/updates";
import { cn } from "@/lib/utils";

interface ChangelogPanelProps {
	open: boolean;
	onClose: () => void;
}

export function ChangelogPanel({ open, onClose }: ChangelogPanelProps) {
	const [mounted, setMounted] = useState(false);
	const [animate, setAnimate] = useState(false);

	useEffect(() => {
		if (open) {
			setMounted(true);
			// Delay para dar tempo de engajar a animação do CSS
			const timer = setTimeout(() => {
				if (typeof window !== "undefined") setAnimate(true);
			}, 20);
			return () => clearTimeout(timer);
		} else {
			setAnimate(false);
			const timer = setTimeout(() => {
				if (typeof window !== "undefined") setMounted(false);
			}, 300);
			return () => clearTimeout(timer);
		}
	}, [open]);

	// Bloquear scroll do corpo quando o painel estiver aberto
	useEffect(() => {
		if (open) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	if (!mounted) return null;

	return (
		<div className="fixed inset-0 z-50 flex justify-end">
			{/* Backdrop */}
			<div
				className={cn(
					"absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out",
					animate ? "opacity-100" : "opacity-0",
				)}
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Panel */}
			<div
				className={cn(
					"relative flex h-full w-full max-w-md flex-col bg-card border-l border-border/60 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:max-w-lg",
					animate ? "translate-x-0" : "translate-x-full",
				)}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-border/50 px-6 py-5 shrink-0">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<Sparkles className="h-4.5 w-4.5" />
						</div>
						<div>
							<h3 className="font-display text-[15px] font-bold leading-tight text-foreground">
								Novidades e Changelog
							</h3>
							<p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mt-0.5">
								Histórico de atualizações
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
						aria-label="Fechar painel"
					>
						<X className="h-4.5 w-4.5" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
					<div className="space-y-8.5">
						{CHANGELOG_DATA.map((update, index) => (
							<div
								key={update.id}
								className="group relative flex flex-col gap-3 rounded-2xl border border-border/40 bg-card-elevated/45 p-5 shadow-xs hover:border-primary/20 hover:bg-card-elevated/85 transition-all duration-200"
								style={{
									animation:
										"t-stagger-fade-in 400ms cubic-bezier(0.16, 1, 0.3, 1) both",
									animationDelay: `${index * 80}ms`,
								}}
							>
								{/* Version and Date */}
								<div className="flex items-center justify-between">
									<span className="inline-flex items-center rounded-lg bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold text-primary">
										v{update.version}
									</span>
									<span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
										<Calendar className="h-3 w-3" />
										{update.date}
									</span>
								</div>

								{/* Title */}
								<h4 className="font-display text-[14px] font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
									{update.title}
								</h4>

								{/* Description */}
								<p className="text-[12px] leading-relaxed text-muted-foreground/90 font-medium">
									{update.description}
								</p>

								{/* Bullet points */}
								<ul className="space-y-2 mt-1">
									{update.bullets.map((bullet) => (
										<li
											key={bullet}
											className="flex items-start gap-2 text-[11.5px] text-muted-foreground leading-relaxed"
										>
											<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
											<span>{bullet}</span>
										</li>
									))}
								</ul>

								{/* Optional Media (MP4 loop) */}
								{update.mediaUrl && (
									<div className="mt-2 overflow-hidden rounded-xl border border-border/50 bg-background">
										{update.mediaType === "video" ? (
											<video
												src={update.mediaUrl}
												autoPlay
												loop
												muted
												playsInline
												className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
											/>
										) : (
											<img
												src={update.mediaUrl}
												alt={update.title}
												className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
											/>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
