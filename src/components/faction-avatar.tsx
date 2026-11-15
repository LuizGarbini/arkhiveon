import { Crown, Flag } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Brasão da facção ou do patrono: a imagem cadastrada, ou o ícone (coroa para
 * patrono, bandeira para o resto) quando não há imagem ou ela não carrega.
 */
export function FactionAvatar({
	imageUrl,
	isPatron = false,
	className,
}: {
	imageUrl?: string | null;
	isPatron?: boolean;
	className?: string;
}) {
	// Guarda a URL que falhou (e não um booleano): se a facção ganhar outra
	// imagem, ela volta a ser tentada.
	const [failedUrl, setFailedUrl] = useState<string | null>(null);
	const url = imageUrl?.trim() || "";
	const showImage = url !== "" && failedUrl !== url;

	return (
		<div
			data-kind={showImage ? "image" : "icon"}
			className={cn(
				"relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border",
				isPatron
					? "border-amber-500/40 bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20"
					: "border-primary/30 bg-primary/10 text-primary",
				className,
			)}
		>
			{showImage ? (
				<img
					src={url}
					alt=""
					loading="lazy"
					decoding="async"
					draggable={false}
					onError={() => setFailedUrl(url)}
					className="size-full object-cover"
				/>
			) : isPatron ? (
				<Crown aria-hidden className="size-4" />
			) : (
				<Flag aria-hidden className="size-4" />
			)}
		</div>
	);
}
