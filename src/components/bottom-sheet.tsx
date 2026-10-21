import { type PointerEvent, type ReactNode, useRef, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Arrastar para baixo além disso fecha o sheet. */
export const BOTTOM_SHEET_DRAG_CLOSE_PX = 80;

/**
 * Sheet de baixo do DS (padrão aprovado no detalhe de números da ficha):
 * Dialog do DS ancorado embaixo, sem X. Fecha tocando fora (overlay),
 * arrastando a alça para baixo ou com Esc.
 */
export function BottomSheet({
	open,
	onOpenChange,
	title,
	subtitle,
	titleClassName = "font-semibold text-foreground",
	className,
	overlayClassName,
	children,
	...rest
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	subtitle?: ReactNode;
	titleClassName?: string;
	className?: string;
	overlayClassName?: string;
	children: ReactNode;
	"aria-label"?: string;
	"data-vtt-focus-scope"?: string;
}) {
	const [dragY, setDragY] = useState(0);
	const dragStart = useRef<number | null>(null);

	const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
		dragStart.current = e.clientY;
		e.currentTarget.setPointerCapture(e.pointerId);
	};
	const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
		if (dragStart.current === null) return;
		setDragY(Math.max(0, e.clientY - dragStart.current));
	};
	const onPointerEnd = () => {
		if (dragStart.current === null) return;
		dragStart.current = null;
		if (dragY > BOTTOM_SHEET_DRAG_CLOSE_PX) onOpenChange(false);
		setDragY(0);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next);
				if (!next) setDragY(0);
			}}
		>
			<DialogContent
				{...rest}
				showCloseButton={false}
				overlayClassName={overlayClassName}
				style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
				className={cn(
					"top-auto bottom-0 left-0 max-h-[85dvh] max-w-full translate-x-0 translate-y-0 gap-3 overflow-y-auto rounded-b-none rounded-t-2xl px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] data-open:slide-in-from-bottom-4 data-open:zoom-in-100 data-closed:zoom-out-100",
					dragY === 0 && "transition-transform duration-150",
					className,
				)}
			>
				<div
					data-testid="bottom-sheet-handle"
					className="-mx-4 -mt-2 flex h-8 cursor-grab touch-none items-center justify-center select-none"
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerEnd}
					onPointerCancel={onPointerEnd}
					aria-hidden="true"
				>
					<span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
				</div>
				<div>
					<DialogTitle className={titleClassName}>{title}</DialogTitle>
					{subtitle ? (
						<DialogDescription className="text-xs">
							{subtitle}
						</DialogDescription>
					) : null}
				</div>
				{children}
			</DialogContent>
		</Dialog>
	);
}
