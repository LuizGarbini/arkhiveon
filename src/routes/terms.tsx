import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, FileText } from "lucide-react";
import { useDocumentMetadata } from "@/hooks/use-document-metadata";

export const Route = createFileRoute("/terms")({
	component: TermsOfServicePage,
});

function TermsOfServicePage() {
	useDocumentMetadata(
		"Termos de Uso — Arkhiveon",
		"Os termos e condições de uso da plataforma Arkhiveon."
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
						<FileText className="h-3.5 w-3.5" />
						Diretrizes e Regras
					</div>
					<h1 className="font-display text-4xl sm:text-5xl font-black text-white tracking-tight">
						Termos de Uso
					</h1>
					<p className="text-sm font-semibold text-white/40">
						Última atualização: 3 de Julho de 2026
					</p>
				</div>

				<div className="mt-12 border-t border-white/10 pt-10 prose prose-invert max-w-none text-white/70 leading-8 space-y-8 text-[15px] sm:text-[16px]">
					<section className="space-y-4">
						<h2 className="font-display text-xl font-bold text-white tracking-wide">
							1. Aceitação dos Termos
						</h2>
						<p>
							Ao se cadastrar ou utilizar de qualquer forma a plataforma Arkhiveon, você concorda em cumprir e estar legalmente vinculado a estes Termos de Uso. Caso discorde de qualquer cláusula ou termo estabelecido aqui, solicitamos que não acesse ou utilize os nossos serviços.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className="font-display text-xl font-bold text-white tracking-wide">
							2. Contas de Usuário
						</h2>
						<p>
							Para utilizar os recursos colaborativos e de armazenamento do Arkhiveon, você deve criar uma conta de acesso. Você é inteiramente responsável por manter o sigilo de suas credenciais de acesso, bem como por qualquer atividade que ocorra sob sua conta. Contas utilizadas de forma fraudulenta ou violando direitos autorais de sistemas de RPG patenteados podem ser suspensas ou encerradas imediatamente.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className="font-display text-xl font-bold text-white tracking-wide">
							3. Conduta Aceitável de Uso
						</h2>
						<p>
							Ao criar fichas e campanhas no Arkhiveon, você concorda em não postar ou carregar materiais que infrinjam direitos de propriedade intelectual alheios, contenham vírus ou códigos maliciosos, ou configurem discurso de ódio, assédio, ou pornografia ilegal.
						</p>
						<p>
							O Arkhiveon é destinado à organização privada ou colaborativa amigável de sessões de RPG de Mesa. O abuso de recursos computacionais (incluindo sobrecarga de banco de dados ou requisições automatizadas abusivas via scripts) resultará no bloqueio imediato do IP e suspensão da conta correspondente.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className="font-display text-xl font-bold text-white tracking-wide">
							4. Assinaturas, Pagamento e Cancelamentos (Plano Pro)
						</h2>
						<p>
							Oferecemos um plano Pro que amplia o limite de campanhas ativas, espaço para imagens e recursos exclusivos. Os pagamentos são processados em moeda nacional através de parceiros terceiros autorizados (como Stripe).
						</p>
						<p>
							Você pode cancelar a renovação da sua assinatura Pro a qualquer momento através do seu painel de cobrança. O cancelamento interrompe a cobrança automática no próximo ciclo mensal de faturamento, mantendo seus benefícios ativos até o final do período contratual corrente.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className="font-display text-xl font-bold text-white tracking-wide">
							5. Propriedade dos Dados de Campanhas
						</h2>
						<p>
							Você retém todos os direitos e a propriedade intelectual sobre todo o conteúdo original que carrega no Arkhiveon (histórias, NPCs criados, imagens originais e anotações de lore). O Arkhiveon não reivindica direitos ou licenciamento sobre suas histórias de jogo.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className="font-display text-xl font-bold text-white tracking-wide">
							6. Limitação de Responsabilidade
						</h2>
						<p>
							A plataforma é oferecida "como está" e "conforme a disponibilidade". Embora nos esforcemos para garantir a segurança dos seus dados de campanha com backups constantes e replicação na nuvem, o Arkhiveon não se responsabiliza por eventuais perdas acidentais de dados de jogo ou indisponibilidade temporária de serviço durante campanhas ativas.
						</p>
					</section>

					<section className="space-y-4">
						<h2 className="font-display text-xl font-bold text-white tracking-wide">
							7. Alterações nos Termos
						</h2>
						<p>
							Reservamo-nos o direito de atualizar ou modificar estes Termos a qualquer momento. Modificações substanciais que afetem os direitos dos usuários serão comunicadas diretamente por e-mail ou via alerta proeminente na página inicial do Arkhiveon.
						</p>
					</section>
				</div>
			</main>
		</div>
	);
}
