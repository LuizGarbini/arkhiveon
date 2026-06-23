import { useNavigate, useRouter } from "@tanstack/react-router";
import { AlertCircle, Home, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorComponentProps {
	error: Error;
	reset?: () => void;
}

export function ErrorComponent({ error, reset }: ErrorComponentProps) {
	const router = useRouter();
	const navigate = useNavigate();

	return (
		<div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
			<div className="relative mb-6">
				<div className="absolute inset-0 animate-pulse rounded-full bg-rose-500/20 blur-2xl" />
				<div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-500 shadow-2xl shadow-rose-500/20">
					<AlertCircle className="h-10 w-10" />
				</div>
			</div>

			<h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
				Falha Crítica!
			</h1>
			<p className="mb-8 max-w-[400px] text-sm leading-relaxed text-muted-foreground">
				Um erro inesperado interrompeu sua jornada no Reino. Não se preocupe,
				seus dados estão seguros.
			</p>

			<div className="mb-8 w-full max-w-md overflow-hidden rounded-lg border border-border/40 bg-muted/30 p-4 text-left">
				<p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
					Detalhes do Erro
				</p>
				<code className="block break-all font-mono text-[11px] text-rose-400">
					{error.message || "Erro desconhecido"}
				</code>
			</div>

			<div className="flex flex-wrap items-center justify-center gap-3">
				<Button
					onClick={() => {
						if (reset) reset();
						router.invalidate();
					}}
					className="gap-2 font-bold shadow-lg shadow-primary/20"
				>
					<RefreshCcw className="h-4 w-4" />
					Tentar Novamente
				</Button>

				<Button
					variant="outline"
					onClick={() => void navigate({ to: "/" })}
					className="gap-2 font-bold"
				>
					<Home className="h-4 w-4" />
					Voltar ao Início
				</Button>
			</div>

			<p className="mt-8 text-[11px] text-muted-foreground/60">
				Se o erro persistir, verifique sua conexão com o Supabase.
			</p>
		</div>
	);
}
