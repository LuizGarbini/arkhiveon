import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ListLayout } from "@/components/list-layout";
import { PageHeader } from "@/components/page-header";
import { SessionCard } from "@/components/session-card";
import { SessionForm } from "@/components/session-form";
import { useRPGStore } from "@/lib/store";

export const Route = createFileRoute("/sessions/")({
	component: RouteComponent,
});

const loadingCardKeys = ["session-1", "session-2", "session-3", "session-4"];

function RouteComponent() {
	const sessions = useRPGStore((state) => state.sessions);
	const [searchQuery, setSearchQuery] = useState("");
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const filteredSessions = useMemo(() => {
		const query = deferredSearchQuery.trim().toLowerCase();
		const filtered = query
			? sessions.filter((session) =>
					session.title.toLowerCase().includes(query),
				)
			: sessions;
		return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
	}, [sessions, deferredSearchQuery]);

	const isLoading = useRPGStore((state) => state.isLoadingRemote);

	return (
		<div className="w-full">
			<PageHeader
				title="Sessões"
				description="Crônicas das aventuras já vividas pelo grupo"
				Icon={ScrollText}
				iconColor="text-amber-300"
				eyebrow="Crônicas"
				count={sessions.length}
				action={<SessionForm />}
			/>

			<div className="px-6 pb-10 sm:px-8">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
					<ListLayout onSearch={setSearchQuery} />

					<div
						className={`${!isLoading && filteredSessions.length === 0 ? "" : "relative border-l border-border/70 pl-8 sm:pl-10 ml-4 sm:ml-8"} space-y-8 py-2`}
					>
						{isLoading
							? loadingCardKeys.map((key, i) => (
									<div
										key={key}
										className="t-stagger-item"
										style={{ "--stagger-index": i } as React.CSSProperties}
									>
										<SessionCard isLoading />
									</div>
								))
							: filteredSessions.map((session, i) => (
									<div
										key={session.id}
										className="t-stagger-item"
										style={{ "--stagger-index": i } as React.CSSProperties}
									>
										<SessionCard session={session} />
									</div>
								))}
						{!isLoading && filteredSessions.length === 0 && (
							<EmptyState
								Icon={ScrollText}
								title="Nenhuma sessão registrada"
								description="Documente o que aconteceu na última partida."
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
