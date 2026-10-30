import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Razões reais do @base-ui/react 1.0.0 (`utils/reason-parts`):
 * clique fora e Esc salvam; o X usa `close-press` e descarta.
 */
const DISMISS_SAVE_REASONS = new Set(["outside-press", "escape-key"]);

export function isDialogDismissSaveReason(reason: string | undefined): boolean {
	return reason !== undefined && DISMISS_SAVE_REASONS.has(reason);
}

function isPromiseLike(value: void | Promise<void>): value is Promise<void> {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof value.then === "function"
	);
}

/** Chama o save e só então `done`. Uma promise é aguardada; o fechamento sempre acontece. */
export function runDismissSaveThen(
	save: (() => void | Promise<void>) | undefined,
	done: () => void,
): void {
	if (!save) {
		done();
		return;
	}
	let result: void | Promise<void>;
	try {
		result = save();
	} catch {
		done();
		return;
	}
	if (isPromiseLike(result)) {
		void Promise.resolve(result)
			.finally(done)
			.catch(() => {});
		return;
	}
	done();
}

function Dialog({
	onDismissSave,
	onOpenChange,
	...props
}: DialogPrimitive.Root.Props & {
	onDismissSave?: () => void | Promise<void>;
}) {
	return (
		<DialogPrimitive.Root
			data-slot="dialog"
			{...props}
			onOpenChange={(open, eventDetails) => {
				if (
					!open &&
					onDismissSave &&
					isDialogDismissSaveReason(eventDetails.reason)
				) {
					runDismissSaveThen(onDismissSave, () => {
						onOpenChange?.(open, eventDetails);
					});
					return;
				}
				onOpenChange?.(open, eventDetails);
			}}
		/>
	);
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
	className,
	...props
}: DialogPrimitive.Backdrop.Props) {
	return (
		<DialogPrimitive.Backdrop
			data-slot="dialog-overlay"
			className={cn(
				"data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/60 duration-150 backdrop-blur-md fixed inset-0 isolate z-50",
				className,
			)}
			{...props}
		/>
	);
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	showOverlay = true,
	overlayClassName,
	...props
}: DialogPrimitive.Popup.Props & {
	showCloseButton?: boolean;
	/** `false` não desenha o overlay. O padrão continua com overlay. */
	showOverlay?: boolean;
	/** Classes extras do overlay (ex.: sheet da mesa sem blur). */
	overlayClassName?: string;
}) {
	return (
		<DialogPortal>
			{showOverlay ? <DialogOverlay className={overlayClassName} /> : null}
			<DialogPrimitive.Popup
				data-slot="dialog-content"
				className={cn(
					"bg-card-elevated border border-border/70 backdrop-blur-xl shadow-2xl data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 grid max-w-[calc(100%-2rem)] gap-6 rounded-2xl p-6 text-sm duration-150 sm:max-w-md fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none",
					className,
				)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
						render={
							<Button
								variant="ghost"
								className="absolute top-4 right-4 text-muted-foreground/80 hover:text-foreground hover:bg-muted/50"
								size="icon-sm"
							/>
						}
					>
						<XIcon />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Popup>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn("gap-2 flex flex-col", className)}
			{...props}
		/>
	);
}

function DialogFooter({
	className,
	showCloseButton = false,
	children,
	...props
}: React.ComponentProps<"div"> & {
	showCloseButton?: boolean;
}) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				"gap-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
				className,
			)}
			{...props}
		>
			{children}
			{showCloseButton && (
				<DialogPrimitive.Close render={<Button variant="outline" />}>
					Close
				</DialogPrimitive.Close>
			)}
		</div>
	);
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("leading-none font-medium", className)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: DialogPrimitive.Description.Props) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn(
				"text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
