import { createFileRoute } from "@tanstack/react-router";
import { Newspaper } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ListLayout } from "@/components/list-layout";
import { NewsCard } from "@/components/news-card";
import { NewsForm } from "@/components/news-form";
import { PageHeader } from "@/components/page-header";
import { useRPGStore } from "@/lib/store";
import { useVisibleWorldEntities } from "@/lib/worldbuilding/hooks";

export const Route = createFileRoute("/news/")({
	component: RouteComponent,
});

const loadingCardKeys = ["news-1", "news-2", "news-3"];

function RouteComponent() {
	const worldNews = useRPGStore((s) => s.worldNews);
	const isLoading = useRPGStore((s) => s.isLoadingRemote);
	const [searchQuery, setSearchQuery] = useState("");
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const visibleNews = useVisibleWorldEntities(worldNews);

	const filtered = useMemo(() => {
		const query = deferredSearchQuery.trim().toLowerCase();
		if (!query) return visibleNews;
		return visibleNews.filter((n) =>
			[n.title, n.body, n.category].join(" ").toLowerCase().includes(query),
		)
	}, [visibleNews, deferredSearchQuery]);

	return (
		<div className="w-full">
			<PageHeader
				title="Mural de Notícias"
				description="Rumores e eventos do Mundo, com audiência global ou restrita"
				Icon={Newspaper}
				iconColor="text-sky-300"
				eyebrow="Worldbuilding"
				count={visibleNews.length}
				action={<NewsForm />}
			/>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 pb-10 sm:px-8">
				<ListLayout onSearch={setSearchQuery} />

				<div className="flex flex-col gap-4">
					{isLoading
						? loadingCardKeys.map((key, i) => (
								<div
									key={key}
									className="t-stagger-item h-32 animate-pulse rounded-2xl border border-border/70 bg-card-elevated/40"
									style={{ "--stagger-index": i } as React.CSSProperties}
								/>
							))
						: filtered.map((news, i) => (
								<div
									key={news.id}
									className="t-stagger-item"
									style={{ "--stagger-index": i } as React.CSSProperties}
								>
									<NewsCard news={news} />
								</div>
							))}
					{!isLoading && filtered.length === 0 && (
						<EmptyState
							Icon={Newspaper}
							title="Nenhuma notícia visível"
							description="Publique rumores e eventos para a mesa ativa."
						/>
					)}
				</div>
			</div>
		</div>
	)
}
