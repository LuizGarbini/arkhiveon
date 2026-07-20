import { Plus } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { PublicationScopeFields } from "@/components/publication-scope-fields";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FormSection } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useIsWorldStaff, useRPGStore } from "@/lib/store";
import type {
	EntityVisibility,
	PublicationScope,
} from "@/lib/worldbuilding/visibility";

export function NewsForm() {
	const addWorldNews = useRPGStore((s) => s.addWorldNews);
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const isStaff = useIsWorldStaff();
	const toast = useToast();
	const [open, setOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [category, setCategory] = useState("rumor");
	const [audience, setAudience] = useState<PublicationScope>("global");
	const [visibility, setVisibility] = useState<EntityVisibility>("public");
	const [campaignIds, setCampaignIds] = useState<string[]>([]);
	const [commentsLocked, setCommentsLocked] = useState(false);
	const titleId = useId();

	useEffect(() => {
		if (
			audience === "restricted" &&
			campaignIds.length === 0 &&
			activeCampaignId
		) {
			setCampaignIds([activeCampaignId]);
		}
	}, [audience, campaignIds.length, activeCampaignId]);

	if (!isStaff) return null;

	const restrictedWithoutCampaigns =
		audience === "restricted" && campaignIds.length === 0;

	function resetForm() {
		setTitle("");
		setBody("");
		setCategory("rumor");
		setAudience("global");
		setVisibility("public");
		setCampaignIds([]);
		setCommentsLocked(false);
		setSubmitting(false);
	}

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) resetForm();
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!title.trim() || !body.trim() || submitting) return;
		if (restrictedWithoutCampaigns) return;

		setSubmitting(true);
		try {
			const created = await addWorldNews({
				title: title.trim(),
				body: body.trim(),
				category: category.trim() || "rumor",
				audience,
				visibility,
				campaignIds: audience === "global" ? [] : campaignIds,
				commentsLocked,
			});
			if (!created) {
				const errorMessage = useRPGStore.getState().syncError;
				toast.error({
					title: "Não foi possível publicar",
					description:
						errorMessage ??
						"Verifique permissões, escopo e conexão, e tente novamente.",
				});
				return;
			}
			resetForm();
			setOpen(false);
			toast.success({
				title: "Notícia publicada",
				description: "O mural do Mundo foi atualizado.",
			});
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<>
			<Button size="sm" type="button" onClick={() => setOpen(true)}>
				<Plus className="h-3.5 w-3.5" />
				Nova notícia
			</Button>
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="max-w-2xl! h-[680px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
					<form
						onSubmit={(e) => void handleSubmit(e)}
						className="flex h-full min-h-0 flex-col"
					>
						<DialogHeader className="border-b border-border px-6 pt-6 pb-4">
							<DialogTitle className="font-display text-lg">
								Publicar no mural
							</DialogTitle>
							<DialogDescription>
								Rumores, editais e eventos para as mesas do Mundo.
							</DialogDescription>
						</DialogHeader>

						<div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
							<FormSection title="Publicação">
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<Field
										label="Título"
										htmlFor={titleId}
										className="sm:col-span-2"
									>
										<Input
											id={titleId}
											placeholder="Ex: Dragões avistados nas Montanhas Cinzentas"
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											required
										/>
									</Field>
									<Field label="Categoria" className="sm:col-span-2">
										<Input
											placeholder="Ex: rumor, edital, evento..."
											value={category}
											onChange={(e) => setCategory(e.target.value)}
										/>
									</Field>
								</div>
								<Field label="Conteúdo">
									<Textarea
										rows={6}
										placeholder="Escreva o rumor, edital ou relato do evento..."
										value={body}
										onChange={(e) => setBody(e.target.value)}
										required
									/>
								</Field>
							</FormSection>

							<FormSection title="Audiência & visibilidade">
								<PublicationScopeFields
									publicationScope={audience}
									visibility={visibility}
									campaignIds={campaignIds}
									onPublicationScopeChange={setAudience}
									onVisibilityChange={setVisibility}
									onCampaignIdsChange={setCampaignIds}
									scopeLabel="Audiência"
								/>
								<label className="flex items-center gap-2 text-[12px] text-muted-foreground">
									<input
										type="checkbox"
										className="h-3.5 w-3.5 rounded border-border accent-primary"
										checked={commentsLocked}
										onChange={(e) => setCommentsLocked(e.target.checked)}
									/>
									Trancar comentários (apenas staff pode comentar)
								</label>
							</FormSection>
						</div>

						<div className="flex items-center justify-end gap-2 border-t border-border bg-card-elevated/40 px-6 py-3">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => handleOpenChange(false)}
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								size="sm"
								disabled={restrictedWithoutCampaigns}
								loading={submitting}
								loadingText="Publicando..."
							>
								Publicar
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
