import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<InputPrimitive
			type={type}
			data-slot="input"
			className={cn(
				"dark:bg-input/10 border-border bg-background px-3 py-1.5 h-10 rounded-lg border text-[16px] md:text-sm shadow-xs transition-all placeholder:text-muted-foreground/60 w-full min-w-0 outline-none focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-primary/15 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
