import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntityCardMediaProps {
	src?: string | null;
	alt: string;
	icon: LucideIcon;
	/** Tailwind classes for the empty-state accent (gradient / icon tint). */
	accentClassName?: string;
	/** Optional initials shown when there is no photo. */
	initials?: string;
}

/**
 * Full-bleed card portrait: real image, or a patterned placeholder so
 * cards never look empty without a photo.
 */
export function EntityCardMedia({
	src,
	alt,
	icon: Icon,
	accentClassName = "from-primary/15 text-primary/25",
	initials,
}: EntityCardMediaProps) {
	const hasImage = Boolean(src);

	return (
		<div
			className={cn(
				"absolute inset-0 -z-10 h-full w-full overflow-hidden bg-linear-to-br to-transparent",
				accentClassName,
			)}
		>
			{hasImage ? (
				<img
					src={src ?? undefined}
					alt={alt}
					loading="lazy"
					decoding="async"
					className="h-full w-full object-cover object-center opacity-70 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
				/>
			) : (
				<div className="relative flex h-full w-full items-center justify-center bg-card-elevated/90 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
					<div
						aria-hidden
						className="absolute inset-0 opacity-[0.12]"
						style={{
							backgroundImage:
								"radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
							backgroundSize: "18px 18px",
						}}
					/>
					<div
						aria-hidden
						className="absolute inset-0 bg-linear-to-br from-white/5 via-transparent to-black/20"
					/>
					{initials ? (
						<span className="relative font-display text-5xl font-bold tracking-tight opacity-30 drop-shadow-sm">
							{initials}
						</span>
					) : (
						<Icon
							className="relative h-20 w-20 opacity-30"
							strokeWidth={1.15}
						/>
					)}
				</div>
			)}
			<div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-black/80 via-black/30 to-transparent" />
			<div className="absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-black via-black/75 to-transparent" />
		</div>
	);
}

export function cardInitials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => word[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}
