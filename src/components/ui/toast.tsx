import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface Toast {
	id: string;
	title: string;
	description?: string;
	variant: ToastVariant;
}

interface ToastInput {
	title: string;
	description?: string;
}

interface ToastContextValue {
	success: (toast: ToastInput) => void;
	error: (toast: ToastInput) => void;
	info: (toast: ToastInput) => void;
	dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON_BY_VARIANT = {
	success: CheckCircle2,
	error: XCircle,
	info: Info,
} satisfies Record<ToastVariant, typeof CheckCircle2>;

const TONE_BY_VARIANT = {
	success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
	error: "border-destructive/35 bg-destructive/10 text-destructive",
	info: "border-primary/30 bg-primary/10 text-primary",
} satisfies Record<ToastVariant, string>;

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const dismiss = useCallback((id: string) => {
		setToasts((current) => current.filter((toast) => toast.id !== id));
	}, []);

	const push = useCallback(
		(variant: ToastVariant, toast: ToastInput) => {
			const id = crypto.randomUUID();
			setToasts((current) => [...current.slice(-3), { id, variant, ...toast }]);
			window.setTimeout(() => dismiss(id), 4500);
		},
		[dismiss],
	);

	const value = useMemo<ToastContextValue>(
		() => ({
			success: (toast) => push("success", toast),
			error: (toast) => push("error", toast),
			info: (toast) => push("info", toast),
			dismiss,
		}),
		[dismiss, push],
	);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div className="fixed right-4 top-4 z-200 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
				{toasts.map((toast) => {
					const Icon = ICON_BY_VARIANT[toast.variant];
					return (
						<output
							key={toast.id}
							className="rounded-lg border border-border bg-card-elevated p-3 text-foreground shadow-lg shadow-black/20 backdrop-blur-md animate-in fade-in-0 slide-in-from-top-2"
						>
							<div className="flex gap-3">
								<div
									className={cn(
										"mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
										TONE_BY_VARIANT[toast.variant],
									)}
								>
									<Icon className="h-3.5 w-3.5" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-[13px] font-semibold leading-tight">
										{toast.title}
									</p>
									{toast.description && (
										<p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
											{toast.description}
										</p>
									)}
								</div>
								<button
									type="button"
									onClick={() => dismiss(toast.id)}
									className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
									aria-label="Fechar notificação"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							</div>
						</output>
					);
				})}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const value = useContext(ToastContext);
	if (!value) {
		throw new Error("useToast deve ser usado dentro de ToastProvider.");
	}
	return value;
}
