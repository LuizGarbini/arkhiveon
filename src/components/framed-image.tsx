import { imageFramingStyle, type ImageFraming } from "@/lib/image-framing";
import { cn } from "@/lib/utils";

interface FramedImageProps {
	src: string;
	alt: string;
	framing?: ImageFraming;
	className?: string;
	imgClassName?: string;
	loading?: "lazy" | "eager";
	decoding?: "async" | "auto" | "sync";
}

export function FramedImage({
	src,
	alt,
	framing,
	className,
	imgClassName,
	loading,
	decoding,
}: FramedImageProps) {
	return (
		<div className={cn("relative h-full w-full overflow-hidden", className)}>
			<img
				src={src}
				alt={alt}
				loading={loading}
				decoding={decoding}
				className={cn("h-full w-full object-cover", imgClassName)}
				style={imageFramingStyle(framing)}
			/>
		</div>
	);
}
