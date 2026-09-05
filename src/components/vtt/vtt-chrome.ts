import { cn } from "@/lib/utils";

export const vttFocusRingClass =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

export const vttPanelClass = cn(
	"rounded-2xl border border-border/70 bg-card/90 text-foreground shadow-lg backdrop-blur-md",
);

export const vttHudClass = cn(
	"rounded-2xl border border-border/70 bg-card/80 text-foreground shadow-lg backdrop-blur-md",
);

export const vttIconButtonClass = cn(
	"flex h-11 w-11 items-center justify-center rounded-xl select-none",
	"transition-all duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation",
	vttFocusRingClass,
);

export const vttIconButtonIdleClass = cn(
	"text-muted-foreground",
	"[@media(hover:hover)]:hover:bg-muted [@media(hover:hover)]:hover:text-foreground",
);

export const vttIconButtonActiveClass = cn(
	"bg-primary text-primary-foreground shadow-md shadow-primary/25",
);

export const vttChipClass = cn(
	"inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3",
	"text-xs font-semibold transition-all duration-150 ease-out active:scale-[0.98]",
	"cursor-pointer touch-manipulation select-none",
	vttFocusRingClass,
);

/** Tool docks: bottom sheet on phones, floating card next to the toolbar on desktop. */
export const vttDockPanelClass = cn(
	vttPanelClass,
	"pointer-events-auto z-30 select-none",
	"absolute inset-x-3 bottom-[5.75rem] max-h-[min(52vh,26rem)] overflow-y-auto p-3",
	"md:inset-x-auto md:bottom-auto md:left-16 md:top-16 md:max-h-[calc(100vh-8rem)] md:w-72",
);
