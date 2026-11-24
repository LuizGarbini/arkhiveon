// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "./button";

const currentSizes = {
	default:
		"h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
	xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
	sm: "h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
	lg: "h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
	icon: "size-9",
	"icon-xs":
		"size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
	"icon-sm":
		"size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md",
	"icon-lg": "size-10",
} as const;

describe("buttonVariants", () => {
	it("touch e icon-touch medem 44px", () => {
		expect(buttonVariants({ size: "touch" })).toContain(
			"h-[44px] gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
		);
		expect(buttonVariants({ size: "icon-touch" })).toContain("size-[44px]");
		expect(buttonVariants({ size: "icon-touch" })).not.toContain("h-[44px]");
	});

	it("não altera as classes dos tamanhos que já existiam", () => {
		const sizes = Object.keys(currentSizes) as (keyof typeof currentSizes)[];
		for (const size of sizes) {
			expect(buttonVariants({ variant: "link", size })).toContain(
				currentSizes[size],
			);
			expect(buttonVariants({ variant: "link", size })).not.toContain(
				"h-[44px]",
			);
			expect(buttonVariants({ variant: "link", size })).not.toContain(
				"size-[44px]",
			);
		}
	});

	it("mantém o snapshot das variantes atuais", () => {
		expect({
			default: buttonVariants({ variant: "default", size: "default" }),
			outline: buttonVariants({ variant: "outline", size: "default" }),
			secondary: buttonVariants({ variant: "secondary", size: "default" }),
			ghost: buttonVariants({ variant: "ghost", size: "default" }),
			destructive: buttonVariants({ variant: "destructive", size: "default" }),
			link: buttonVariants({ variant: "link", size: "default" }),
			sizes: Object.fromEntries(
				(Object.keys(currentSizes) as (keyof typeof currentSizes)[]).map(
					(size) => [size, buttonVariants({ variant: "ghost", size })],
				),
			),
		}).toMatchInlineSnapshot(`
			{
			  "default": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none relative isolate overflow-hidden border-primary/35 bg-[linear-gradient(180deg,oklch(0.30_0.07_290)_0%,oklch(0.22_0.055_290)_52%,oklch(0.17_0.04_290)_100%)] text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.16),inset_0_-1px_0_oklch(0_0_0/0.22),0_14px_32px_-22px_var(--primary)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/35 before:to-transparent after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,var(--primary-glow),transparent_55%)] after:opacity-45 hover:border-primary/55 hover:bg-[linear-gradient(180deg,oklch(0.34_0.08_290)_0%,oklch(0.25_0.065_290)_52%,oklch(0.19_0.045_290)_100%)] hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.18),inset_0_-1px_0_oklch(0_0_0/0.18),0_18px_40px_-22px_var(--primary)] h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
			  "destructive": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30 h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
			  "ghost": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
			  "link": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none text-primary underline-offset-4 hover:underline h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
			  "outline": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none border-border/80 bg-background/65 text-foreground shadow-xs hover:border-primary/35 hover:bg-primary/10 hover:text-primary dark:bg-input/30 dark:border-input dark:hover:bg-primary/10 aria-expanded:border-primary/35 aria-expanded:bg-primary/10 aria-expanded:text-primary h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
			  "secondary": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none border-border/70 bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
			  "sizes": {
			    "default": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
			    "icon": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground size-9",
			    "icon-lg": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground size-10",
			    "icon-sm": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md",
			    "icon-xs": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
			    "lg": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
			    "sm": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
			    "xs": "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 disabled:active:scale-100 data-disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
			  },
			}
		`);
	});
});

describe("Button com loadingText", () => {
	it("mantém o rótulo visível no mount, inclusive no Strict Mode", () => {
		render(
			<StrictMode>
				<Button variant="destructive" loadingText="Excluindo...">
					Excluir
				</Button>
			</StrictMode>,
		);
		const button = screen.getByRole("button", { name: "Excluir" });
		const swap = button.querySelector(".t-text-swap");
		expect(swap?.textContent).toBe("Excluir");
		expect(swap?.className).not.toContain("is-exit");
		expect(swap?.className).not.toContain("is-enter-start");
	});
});
