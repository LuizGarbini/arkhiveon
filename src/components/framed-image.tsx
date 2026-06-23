import { type ImageFraming, imageFramingStyle } from "@/lib/image-framing";
import { cn } from "@/lib/utils";

interface FramedImageProps {
	src: string;
	alt: string;
	framing?: ImageFraming;
	className?: string;
	innerClassName?: string;
	imgClassName?: string;
	loading?: "lazy" | "eager";
	decoding?: "async" | "auto" | "sync";
}

export function FramedImage({
	src,
	alt,
	framing,
	className,
	innerClassName,
	imgClassName,
	loading,
	decoding,
}: FramedImageProps) {
	return (
		<div className={cn("relative h-full w-full overflow-hidden", className)}>
			<div className={cn("h-full w-full", innerClassName)}>
				<img
					src={src}
					alt={alt}
					loading={loading}
					decoding={decoding}
					className={cn("h-full w-full object-cover", imgClassName)}
					style={imageFramingStyle(framing)}
				/>
			</div>
		</div>
	);
}
