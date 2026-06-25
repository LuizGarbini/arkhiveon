import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	const [isShaking, setIsShaking] = React.useState(false);
	const isInvalid = props["aria-invalid"];

	React.useEffect(() => {
		if (isInvalid) {
			setIsShaking(true);
			const timer = setTimeout(() => setIsShaking(false), 290);
			return () => clearTimeout(timer);
		}
	}, [isInvalid]);

	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"t-input dark:bg-input/10 border-border bg-background flex min-h-20 w-full rounded-lg border px-3 py-2 text-[16px] md:text-sm shadow-xs transition-all outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-primary/15 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:cursor-not-allowed disabled:opacity-50",
				isShaking && "is-shaking",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
