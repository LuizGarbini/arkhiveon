import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface Toast {
	id: string;
	title: string;
	description?: string;
	variant: ToastVariant;
	/** Indica que o toast está saindo (animação de dismiss) */
	dismissing?: boolean;
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

/** Duração da animação de saída em ms — deve espelhar a CSS */
const EXIT_DURATION_MS = 280;
const AUTO_DISMISS_MS = 4500;

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
	const timersRef = useRef<Map<string, number>>(new Map());

	/** Remove efetivamente o toast do array (pós-animação de saída) */
	const remove = useCallback((id: string) => {
		setToasts((current) => current.filter((t) => t.id !== id));
		timersRef.current.delete(id);
	}, []);

	/** Inicia a animação de saída e agenda a remoção real */
	const dismiss = useCallback(
		(id: string) => {
			setToasts((current) =>
				current.map((t) => (t.id === id ? { ...t, dismissing: true } : t)),
			);
			// Limpa timer de auto-dismiss se existir
			const existing = timersRef.current.get(id);
			if (existing) clearTimeout(existing);

			const timer = window.setTimeout(() => remove(id), EXIT_DURATION_MS);
			timersRef.current.set(id, timer);
		},
		[remove],
	);

	const push = useCallback(
		(variant: ToastVariant, toast: ToastInput) => {
			const id = crypto.randomUUID();
			setToasts((current) => [...current.slice(-3), { id, variant, ...toast }]);
			const timer = window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
			timersRef.current.set(id, timer);
		},
		[dismiss],
	);

	// Limpar timers ao desmontar
	useEffect(() => {
		const timers = timersRef.current;
		return () => {
			for (const timer of timers.values()) clearTimeout(timer);
			timers.clear();
		};
	}, []);

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
							className={cn(
								"rounded-lg border border-border bg-card-elevated p-3 text-foreground shadow-lg shadow-black/20 backdrop-blur-md",
								"transition-all ease-[cubic-bezier(0.16,1,0.3,1)]",
								toast.dismissing
									? "translate-x-2 scale-95 opacity-0"
									: "animate-in fade-in-0 slide-in-from-top-2 translate-x-0 scale-100 opacity-100",
							)}
							style={{ transitionDuration: `${EXIT_DURATION_MS}ms` }}
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
