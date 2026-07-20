import { ChevronDown, Lock, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { countNewsComments } from "@/lib/remote-worldbuilding";
import {
	useActiveCampaignRole,
	useIsWorldStaff,
	useRPGStore,
} from "@/lib/store";
import type { NewsComment, WorldNews } from "@/lib/store/types";
import { getSupabase } from "@/lib/supabase";
import { useActiveCampaignContext } from "@/lib/worldbuilding/hooks";
import {
	canCommentOnNews,
	canViewScopedContent,
} from "@/lib/worldbuilding/visibility";

interface NewsCardProps {
	news: WorldNews;
}

export function NewsCard({ news }: NewsCardProps) {
	const [expanded, setExpanded] = useState(false);
	const [replyingToId, setReplyingToId] = useState<string | null>(null);
	const [replyBody, setReplyBody] = useState("");
	const [commentBody, setCommentBody] = useState("");
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [commentCount, setCommentCount] = useState(news.commentCount ?? 0);
	const [editOpen, setEditOpen] = useState(false);
	const [editTitle, setEditTitle] = useState(news.title);
	const [editBody, setEditBody] = useState(news.body);
	const [editCategory, setEditCategory] = useState(news.category);
	const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
	const [editingCommentBody, setEditingCommentBody] = useState("");

	const role = useActiveCampaignRole();
	const isStaff = useIsWorldStaff();
	const activeCampaign = useActiveCampaignContext();
	const campaigns = useRPGStore((s) => s.campaigns);
	const loadNewsComments = useRPGStore((s) => s.loadNewsComments);
	const addNewsComment = useRPGStore((s) => s.addNewsComment);
	const updateWorldNews = useRPGStore((s) => s.updateWorldNews);
	const removeWorldNews = useRPGStore((s) => s.removeWorldNews);
	const updateNewsComment = useRPGStore((s) => s.updateNewsComment);
	const removeNewsComment = useRPGStore((s) => s.removeNewsComment);
	const allNewsComments = useRPGStore((s) => s.newsComments);
	const newsComments = useMemo(
		() => allNewsComments.filter((c) => c.newsId === news.id),
		[allNewsComments, news.id],
	);

	useEffect(() => {
		const supabase = getSupabase();
		if (!supabase) return;
		void supabase.auth.getUser().then(({ data }) => {
			setCurrentUserId(data.user?.id ?? null);
		});
	}, []);

	useEffect(() => {
		setCommentCount(news.commentCount ?? 0);
	}, [news.commentCount]);

	useEffect(() => {
		let cancelled = false;
		void countNewsComments(news.id)
			.then((count) => {
				if (!cancelled) setCommentCount(count);
			})
			.catch(() => {
				/* contagem opcional */
			});
		return () => {
			cancelled = true;
		};
	}, [news.id]);

	if (!canViewScopedContent(news, activeCampaign, role, campaigns)) return null;

	const canComment = canCommentOnNews(news, activeCampaign, role, campaigns);
	const rootComments = newsComments.filter((c) => !c.parentId);
	const repliesByParent = newsComments.reduce<
		Record<string, typeof newsComments>
	>((acc, comment) => {
		if (!comment.parentId) return acc;
		acc[comment.parentId] = [...(acc[comment.parentId] ?? []), comment];
		return acc;
	}, {});

	function canModerateComment(comment: NewsComment) {
		return (
			isStaff || (currentUserId != null && comment.authorId === currentUserId)
		);
	}

	async function openThread() {
		if (!expanded) {
			await loadNewsComments(news.id);
		}
		setExpanded((v) => !v);
	}

	async function submitComment(parentId?: string | null) {
		const created = await addNewsComment(news.id, commentBody, parentId);
		if (created) {
			setCommentBody("");
			setCommentCount((c) => c + 1);
		}
	}

	async function submitReply(parentId: string) {
		const created = await addNewsComment(news.id, replyBody, parentId);
		if (created) {
			setReplyBody("");
			setReplyingToId(null);
			setCommentCount((c) => c + 1);
		}
	}

	function saveNewsEdit() {
		if (!editTitle.trim() || !editBody.trim()) return;
		updateWorldNews(news.id, {
			title: editTitle.trim(),
			body: editBody.trim(),
			category: editCategory.trim(),
		});
		setEditOpen(false);
	}

	function toggleCommentsLocked() {
		updateWorldNews(news.id, { commentsLocked: !news.commentsLocked });
	}

	function startEditComment(comment: NewsComment) {
		setEditingCommentId(comment.id);
		setEditingCommentBody(comment.body);
	}

	function saveCommentEdit() {
		if (!editingCommentId || !editingCommentBody.trim()) return;
		updateNewsComment(editingCommentId, editingCommentBody.trim());
		setEditingCommentId(null);
		setEditingCommentBody("");
	}

	function deleteComment(comment: NewsComment) {
		const removed =
			1 + newsComments.filter((c) => c.parentId === comment.id).length;
		removeNewsComment(comment.id);
		setCommentCount((c) => Math.max(0, c - removed));
	}

	return (
		<article className="rounded-2xl border border-border/70 bg-card-elevated/40 p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
							{news.category || "Rumor"}
						</span>
						{news.visibility === "master_secret" && (
							<span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
								Segredo
							</span>
						)}
						{news.commentsLocked && (
							<span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
								<Lock className="h-3 w-3" />
								Comentários trancados
							</span>
						)}
					</div>
					<h3 className="font-display mt-2 text-lg font-bold">{news.title}</h3>
					<p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
						{news.body}
					</p>
				</div>

				{isStaff && (
					<div className="flex shrink-0 items-center gap-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => {
								setEditTitle(news.title);
								setEditBody(news.body);
								setEditCategory(news.category);
								setEditOpen(true);
							}}
							title="Editar notícia"
						>
							<Pencil className="h-3.5 w-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={toggleCommentsLocked}
							title={
								news.commentsLocked
									? "Destrancar comentários"
									: "Trancar comentários"
							}
						>
							<Lock className="h-3.5 w-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => removeWorldNews(news.id)}
							title="Excluir notícia"
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				)}
			</div>

			<div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => void openThread()}
				>
					<MessageSquare className="h-4 w-4" />
					{commentCount} comentários
					<ChevronDown
						className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
					/>
				</Button>
			</div>

			{expanded && (
				<div className="mt-3 space-y-3 border-t border-border/40 pt-3">
					{rootComments.map((comment) => (
						<div key={comment.id} className="space-y-2">
							<div className="rounded-lg bg-background/50 px-3 py-2 text-sm">
								{editingCommentId === comment.id ? (
									<div className="space-y-2">
										<textarea
											className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
											rows={2}
											value={editingCommentBody}
											onChange={(e) => setEditingCommentBody(e.target.value)}
										/>
										<div className="flex gap-2">
											<Button type="button" size="sm" onClick={saveCommentEdit}>
												Salvar
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => setEditingCommentId(null)}
											>
												Cancelar
											</Button>
										</div>
									</div>
								) : (
									<div className="flex items-start justify-between gap-2">
										<p className="flex-1">{comment.body}</p>
										{canModerateComment(comment) && (
											<div className="flex shrink-0 gap-1">
												<button
													type="button"
													className="text-muted-foreground hover:text-primary"
													onClick={() => startEditComment(comment)}
													title="Editar comentário"
												>
													<Pencil className="h-3 w-3" />
												</button>
												<button
													type="button"
													className="text-muted-foreground hover:text-rose-300"
													onClick={() => deleteComment(comment)}
													title="Excluir comentário"
												>
													<Trash2 className="h-3 w-3" />
												</button>
											</div>
										)}
									</div>
								)}
							</div>

							{(repliesByParent[comment.id] ?? []).map((reply) => (
								<div
									key={reply.id}
									className="ml-4 rounded-lg border border-border/50 bg-background/30 px-3 py-2 text-sm"
								>
									{editingCommentId === reply.id ? (
										<div className="space-y-2">
											<textarea
												className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
												rows={2}
												value={editingCommentBody}
												onChange={(e) => setEditingCommentBody(e.target.value)}
											/>
											<div className="flex gap-2">
												<Button
													type="button"
													size="sm"
													onClick={saveCommentEdit}
												>
													Salvar
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => setEditingCommentId(null)}
												>
													Cancelar
												</Button>
											</div>
										</div>
									) : (
										<div className="flex items-start justify-between gap-2">
											<p className="flex-1">{reply.body}</p>
											{canModerateComment(reply) && (
												<div className="flex shrink-0 gap-1">
													<button
														type="button"
														className="text-muted-foreground hover:text-primary"
														onClick={() => startEditComment(reply)}
														title="Editar comentário"
													>
														<Pencil className="h-3 w-3" />
													</button>
													<button
														type="button"
														className="text-muted-foreground hover:text-rose-300"
														onClick={() => deleteComment(reply)}
														title="Excluir comentário"
													>
														<Trash2 className="h-3 w-3" />
													</button>
												</div>
											)}
										</div>
									)}
								</div>
							))}

							{canComment && (
								<div className="ml-0 space-y-2">
									{replyingToId === comment.id ? (
										<div className="flex flex-col gap-2 sm:flex-row">
											<input
												className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
												placeholder="Sua resposta..."
												value={replyBody}
												onChange={(e) => setReplyBody(e.target.value)}
											/>
											<div className="flex gap-2">
												<Button
													type="button"
													size="sm"
													onClick={() => void submitReply(comment.id)}
													disabled={!replyBody.trim()}
												>
													Enviar
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => {
														setReplyingToId(null);
														setReplyBody("");
													}}
												>
													Cancelar
												</Button>
											</div>
										</div>
									) : (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => {
												setReplyingToId(comment.id);
												setReplyBody("");
											}}
										>
											Responder
										</Button>
									)}
								</div>
							)}
						</div>
					))}

					{canComment && (
						<div className="flex gap-2">
							<input
								className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
								placeholder="Comentar..."
								value={commentBody}
								onChange={(e) => setCommentBody(e.target.value)}
							/>
							<Button
								type="button"
								size="sm"
								onClick={() => void submitComment(null)}
								disabled={!commentBody.trim()}
							>
								Enviar
							</Button>
						</div>
					)}
				</div>
			)}

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Editar notícia</DialogTitle>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<div className="space-y-1.5">
							<Label htmlFor={`edit-news-title-${news.id}`}>Título</Label>
							<Input
								id={`edit-news-title-${news.id}`}
								value={editTitle}
								onChange={(e) => setEditTitle(e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`edit-news-category-${news.id}`}>Categoria</Label>
							<Input
								id={`edit-news-category-${news.id}`}
								value={editCategory}
								onChange={(e) => setEditCategory(e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor={`edit-news-body-${news.id}`}>Conteúdo</Label>
							<Textarea
								id={`edit-news-body-${news.id}`}
								rows={5}
								value={editBody}
								onChange={(e) => setEditBody(e.target.value)}
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="ghost"
								onClick={() => setEditOpen(false)}
							>
								Cancelar
							</Button>
							<Button type="button" onClick={saveNewsEdit}>
								Salvar
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</article>
	);
}
