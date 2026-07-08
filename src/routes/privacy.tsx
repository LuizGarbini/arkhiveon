import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, ShieldCheck } from "lucide-react";
import { useDocumentMetadata } from "@/hooks/use-document-metadata";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
	useDocumentMetadata(
		"Política de Privacidade — Arkhiveon",
		"Como coletamos, usamos e protegemos suas informações pessoais."
	);

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[#060408] text-foreground font-sans pb-24">
			{/* Premium Grid Pattern Background */}
			<div
				className="pointer-events-none absolute inset-0 -z-20 opacity-70"
				style={{
					backgroundImage: `
						radial-gradient(circle at 50% -20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
						linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
						linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
					`,
					backgroundSize: "100% 100%, 100% 100%, 48px 48px, 48px 48px",
					backgroundPosition: "center, center, center, center",
					maskImage: "linear-gradient(to bottom, black, transparent)",
					WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
				}}
			/>

			{/* Floating Simple Header */}
			<header className="sticky top-4 z-50 w-full px-6 flex justify-center">
				<div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between rounded-2xl border border-purple-500/20 bg-[#0d091a]/85 px-6 shadow-xl backdrop-blur-xl">
					<Link to="/" className="flex items-center gap-3">
						<span className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400">
							<BookOpen className="h-4 w-4" />
						</span>
						<span className="font-display text-[14px] font-bold tracking-[0.2em] text-white">
							ARKHIVEON
						</span>
					</Link>
				</div>
			</header>

			{/* Main Legal Content Container */}
			<main className="mx-auto max-w-3xl px-6 pt-20 sm:pt-28">
				<Link
					to="/"
					className="inline-flex items-center gap-2 mb-8 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Voltar para o início
				</Link>

				<div className="flex flex-col items-start gap-4">
					<div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/8 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-purple-400">
						<ShieldCheck className="h-3.5 w-3.5" />
						Transparência e Segurança
					</div>
					<h1 className="font-display text-4xl sm:text-5xl font-black text-white tracking-tight">
						Política de Privacidade
					</h1>
					<p className="text-sm font-semibold text-white/40">
						Última atualização: 3 de Julho de 2026
					</p>
				</div>

				<div className="mt-12 border-t border-white/10 pt-10 prose prose-invert max-w-none text-white/70 leading-8 space-y-8 text-[15px] sm:text-[16px]">
					<section className="space-y-4">
						<h2 className="font-display text-xl font-bold text-white tracking-wide">
							1. Coleta de Informações
						</h2>
						<p>
							O Arkhiveon coleta informações essenciais para o funcionamento do seu grimório digital. Isso inclui dados fornecidos diretamente por você, como seu e-mail, nome de exibição e senha (criptografada) no momento de registro da sua conta.
						</p>
						<p>
							Além disso, dados referentes às suas campanhas de RPG de Mesa, incluindo fichas de personagens, anotações de lore, logs de sessões e uploads de imagens de entidades, são armazenados de forma segura em nossos servidores para permitir a sincronização em tempo real entre seus dispositivos.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className="font-display text-xl font-bold text-white tracking-wide">
							2. Uso de Dados
						</h2>
						<p>
							Utilizamos seus dados exclusivamente para:
						</p>
						<ul className="list-disc list-inside pl-4 space-y-2">
							<li>Manter e sincronizar o conteúdo das suas campanhas em tempo real;</li>
							<li>Autenticar seu acesso com segurança à plataforma;</li>
							<li>Processar pagamentos e gerenciar assinaturas ativas do plano Pro;</li>
							<li>Prevenir abusos e garantir a estabilidade operacional dos nossos sistemas de banco de dados.</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className="font-display text-xl font-bold text-white tracking-wide">
							3. Armazenamento e Segurança
						</h2>
						<p>
							Empregamos práticas de segurança de ponta para proteger as informações da sua conta e campanhas. A comunicação entre o seu navegador e a plataforma é totalmente criptografada via protocolo HTTPS/SSL.
						</p>
						<p>
							Nossos bancos de dados e sistemas de armazenamento de arquivos (imagens de personagens e NPCs) são protegidos por rigorosas regras de segurança em nível de linha (RLS) no Supabase, garantindo que apenas membros autorizados de uma campanha possam visualizar ou modificar os dados correspondentes.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className="font-display text-xl font-bold text-white tracking-wide">
							4. Compartilhamento de Informações
						</h2>
						<p>
							O Arkhiveon **nunca** comercializa, vende ou aluga seus dados pessoais para terceiros.
						</p>
						<p>
							Seus dados de campanha podem ser compartilhados com outros jogadores apenas através de links de convite explícitos gerados por você dentro da ferramenta de colaboração em tempo real. Serviços terceiros (como Stripe para pagamentos) recebem apenas as informações estritamente necessárias para a execução de suas respectivas funções financeiras sob termos estritos de confidencialidade.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className="font-display text-xl font-bold text-white tracking-wide">
							5. Seus Direitos (LGPD)
						</h2>
						<p>
							Conforme os preceitos da Lei Geral de Proteção de Dados (LGPD), você tem total controle sobre seus dados pessoais armazenados na nossa plataforma. Você pode, a qualquer momento:
						</p>
						<ul className="list-disc list-inside pl-4 space-y-2">
							<li>Acessar, exportar ou editar as informações de suas campanhas e fichas;</li>
							<li>Solicitar a exclusão definitiva dos seus dados e encerramento da sua conta diretamente no painel de configurações;</li>
							<li>Retirar o consentimento para recebimento de e-mails informativos ou notificações de atualização.</li>
						</ul>
					</section>

					<section className="space-y-4">
						<h2 className="font-display text-xl font-bold text-white tracking-wide">
							6. Contato
						</h2>
						<p>
							Se você tiver qualquer dúvida ou solicitação sobre as práticas de privacidade de dados adotadas pelo Arkhiveon, entre em contato diretamente pelo e-mail:{" "}
							<a
								href="mailto:contato@arkhiveon.com"
								className="text-purple-400 hover:text-purple-300 underline font-semibold"
							>
								contato@arkhiveon.com
							</a>.
						</p>
					</section>
				</div>
			</main>
		</div>
	);
}
