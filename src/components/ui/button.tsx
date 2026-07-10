import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { useEffect, useState, useRef } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-semibold focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
	{
		variants: {
			variant: {
				default:
					"relative isolate overflow-hidden border-primary/35 bg-[linear-gradient(180deg,oklch(0.30_0.07_290)_0%,oklch(0.22_0.055_290)_52%,oklch(0.17_0.04_290)_100%)] text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.16),inset_0_-1px_0_oklch(0_0_0/0.22),0_14px_32px_-22px_var(--primary)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/35 before:to-transparent after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,var(--primary-glow),transparent_55%)] after:opacity-45 hover:border-primary/55 hover:bg-[linear-gradient(180deg,oklch(0.34_0.08_290)_0%,oklch(0.25_0.065_290)_52%,oklch(0.19_0.045_290)_100%)] hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.18),inset_0_-1px_0_oklch(0_0_0/0.18),0_18px_40px_-22px_var(--primary)]",
				outline:
					"border-border/80 bg-background/65 text-foreground shadow-xs hover:border-primary/35 hover:bg-primary/10 hover:text-primary dark:bg-input/30 dark:border-input dark:hover:bg-primary/10 aria-expanded:border-primary/35 aria-expanded:bg-primary/10 aria-expanded:text-primary",
				secondary:
					"border-border/70 bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
				ghost:
					"hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
				destructive:
					"bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
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
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export type ButtonProps = ButtonPrimitive.Props &
	VariantProps<typeof buttonVariants> & {
		loading?: boolean;
		loadingText?: string;
	};

function Button({
	className,
	variant = "default",
	size = "default",
	loading = false,
	loadingText,
	children,
	disabled,
	...props
}: ButtonProps) {
	const [text, setText] = useState<React.ReactNode>(() => (loading && loadingText ? loadingText : children));
	const [stateClass, setStateClass] = useState("");
	const isFirstRender = useRef(true);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		if (loading && loadingText) {
			setStateClass("is-exit");
			const timer1 = setTimeout(() => {
				setText(loadingText);
				setStateClass("is-enter-start");
				const timer2 = setTimeout(() => {
					setStateClass("");
				}, 20);
				return () => clearTimeout(timer2);
			}, 200);
			return () => clearTimeout(timer1);
		} else if (!loading) {
			setStateClass("is-exit");
			const timer1 = setTimeout(() => {
				setText(children);
				setStateClass("is-enter-start");
				const timer2 = setTimeout(() => {
					setStateClass("");
				}, 20);
				return () => clearTimeout(timer2);
			}, 200);
			return () => clearTimeout(timer1);
		}
	}, [loading, loadingText]);

	// Update text instantly when children changes under non-loading state
	useEffect(() => {
		if (!loading) {
			setText(children);
		}
	}, [children, loading]);

	const hasTransition = loadingText !== undefined;
	const content = hasTransition ? (
		<span className={cn("t-text-swap inline-flex items-center justify-center gap-1.5", stateClass)}>
			{text}
		</span>
	) : (
		children
	);

	return (
		<ButtonPrimitive
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			disabled={disabled || loading}
			{...props}
		>
			{content}
		</ButtonPrimitive>
	);
}

export { Button, buttonVariants };
