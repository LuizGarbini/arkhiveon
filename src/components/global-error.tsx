import { Link } from "@tanstack/react-router";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";

const DEFAULT_TITLE = "Algo quebrou no Arkhiveon";
const DEFAULT_MESSAGE =
	"Não foi possível carregar esta parte da aventura. Tente novamente ou volte para uma área segura.";
const MAX_ERROR_TEXT_LENGTH = 900;

interface GlobalErrorProps {
	error: unknown;
	reset?: () => void;
}

interface ErrorDetails {
	title: string;
	message: string;
}

export function GlobalError({ error, reset }: GlobalErrorProps) {
	const descriptionId = useId();
	const errorDetails = getErrorDetails(error);

	return (
		<div
			className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
			role="alert"
			aria-describedby={descriptionId}
		>
			<div className="pointer-events-none fixed inset-0 -z-20 arcane-grid opacity-[0.05]" />
			<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_650px_420px_at_50%_20%,var(--primary-muted),transparent_70%)]" />

			<section className="panel corner-mark w-full max-w-xl overflow-hidden p-6 text-center shadow-2xl shadow-black/10 sm:p-10">
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/10 text-destructive shadow-lg shadow-destructive/5">
					<AlertTriangle className="h-7 w-7" strokeWidth={1.7} />
				</div>

				<p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
					Encontro inesperado
				</p>
				<h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
					{errorDetails.title}
				</h1>
				<p
					id={descriptionId}
					className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]"
				>
					{errorDetails.message}
				</p>

				<div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
					<Button
						type="button"
						className="gap-2 px-5 font-bold sm:min-w-44"
						onClick={() => {
							if (reset) {
								reset();
								return;
							}

							window.location.reload();
						}}
					>
						<RefreshCcw className="h-4 w-4" />
						Tentar novamente
					</Button>
					<Link to="/">
						<Button
							variant="outline"
							className="w-full gap-2 px-5 font-bold sm:min-w-32"
						>
							<Home className="h-4 w-4" />
							Início
						</Button>
					</Link>
				</div>
			</section>
		</div>
	);
}

export function getErrorDetails(error: unknown): ErrorDetails {
	if (error instanceof AggregateError) {
		const message = cleanErrorText(error.message);
		const firstCause = error.errors.find((cause) => cause !== undefined);
		const firstCauseDetails = firstCause
			? getErrorDetails(firstCause)
			: undefined;

		return {
			title: DEFAULT_TITLE,
			message:
				message ??
				firstCauseDetails?.message ??
				"Mais de uma falha aconteceu ao carregar esta tela.",
		};
	}

	if (error instanceof Error) {
		const title = cleanErrorText(error.name);
		const message = cleanErrorText(error.message);

		return {
			title: title && title !== "Error" ? title : DEFAULT_TITLE,
			message: message ?? DEFAULT_MESSAGE,
		};
	}

	if (typeof error === "string") {
		return {
			title: DEFAULT_TITLE,
			message: cleanErrorText(error) ?? DEFAULT_MESSAGE,
		};
	}

	if (isRecord(error)) {
		const message = cleanErrorText(error.message);
		const code = cleanErrorText(error.code);
		const name = cleanErrorText(error.name);

		return {
			title: name ?? DEFAULT_TITLE,
			message:
				message ??
				(code ? `A falha retornou o código ${code}.` : DEFAULT_MESSAGE),
		};
	}

	return {
		title: DEFAULT_TITLE,
		message: DEFAULT_MESSAGE,
	};
}

function cleanErrorText(value: unknown) {
	if (typeof value !== "string") return undefined;

	const normalized = value.trim().replace(/\s+/g, " ");
	return normalized.length > 0 ? truncateErrorText(normalized) : undefined;
}

function truncateErrorText(value: string) {
	return value.length > MAX_ERROR_TEXT_LENGTH
		? `${value.slice(0, MAX_ERROR_TEXT_LENGTH)}...`
		: value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
