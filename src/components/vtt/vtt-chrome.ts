import { cn } from "@/lib/utils";

export const vttPanelClass = cn(
	"rounded-2xl border border-border/70 bg-card/90 text-foreground shadow-lg backdrop-blur-md",
);

export const vttHudClass = cn(
	"rounded-2xl border border-border/70 bg-card/80 text-foreground shadow-lg backdrop-blur-md",
);

export const vttIconButtonClass = cn(
	"flex h-[44px] w-[44px] min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl",
	"transition-all duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
);

export const vttIconButtonIdleClass = cn(
	"text-muted-foreground hover:bg-muted hover:text-foreground",
);

export const vttIconButtonActiveClass = cn(
	"bg-primary text-primary-foreground shadow-md shadow-primary/25",
);

export const vttChipClass = cn(
	"inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3",
	"text-xs font-semibold transition-all duration-150 ease-out active:scale-[0.98]",
	"cursor-pointer touch-manipulation",
);
