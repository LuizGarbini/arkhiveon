import { Copy, Search, WandSparkles } from "lucide-react";
import { type ReactNode, useDeferredValue, useMemo, useState } from "react";
import { copyItemMechanics } from "@/core/rules/item-mechanics";
import type { Item, ItemOrigin } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useVisibleWorldEntities } from "@/lib/worldbuilding/hooks";
import { FormSection } from "../ui/form-tabs";
import { Input } from "../ui/input";

interface StartCardProps {
	active: boolean;
	icon: ReactNode;
	title: string;
	description: string;
	onClick: () => void;
}

function StartCard({
	active,
	icon,
	title,
	description,
	onClick,
}: StartCardProps) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={cn(
				"flex min-h-16 cursor-pointer select-none items-start gap-3 rounded-xl border p-3.5 text-left transition-colors duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
				active
					? "border-primary/50 bg-primary/10"
					: "border-border/60 bg-background/30 hover:border-primary/30",
			)}
		>
			<span
				className={cn(
					"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
					active
						? "bg-primary/20 text-primary"
						: "bg-muted/50 text-muted-foreground",
				)}
			>
				{icon}
			</span>
			<span className="min-w-0">
				<span className="block text-[13px] font-semibold text-foreground">
					{title}
				</span>
				<span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
					{description}
				</span>
			</span>
		</button>
	);
}

interface ItemStartFromProps {
	origin?: ItemOrigin;
	onBlank: () => void;
	onCopy: (patch: ReturnType<typeof copyItemMechanics>) => void;
}

/** "Começar de": em branco ou cópia independente de um item da campanha ativa. */
export function ItemStartFrom({ origin, onBlank, onCopy }: ItemStartFromProps) {
	const [picking, setPicking] = useState(origin?.kind === "copy");
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const items = useRPGStore((state) => state.items);
	const visible = useVisibleWorldEntities(items);
	const filtered = useMemo(() => {
		const q = deferredQuery.trim().toLowerCase();
		const list = q
			? visible.filter((i) => i.name.toLowerCase().includes(q))
			: visible;
		return list.slice(0, 30);
	}, [visible, deferredQuery]);

	const copyActive = picking || origin?.kind === "copy";

	return (
		<FormSection title="Começar de">
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<StartCard
					active={!copyActive}
					icon={<WandSparkles className="h-4 w-4" />}
					title="Em branco"
					description="Arma personalizada: você define dano, tipo e propriedades."
					onClick={() => {
						setPicking(false);
						onBlank();
					}}
				/>
				<StartCard
					active={copyActive}
					icon={<Copy className="h-4 w-4" />}
					title="A partir de um item da campanha"
					description="Copia os números de um item que já existe; tudo continua editável."
					onClick={() => setPicking(true)}
				/>
			</div>
			{copyActive ? (
				<div className="space-y-2 rounded-xl border border-border/60 bg-background/30 p-3">
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							aria-label="Buscar item da campanha"
							placeholder="Buscar item da campanha…"
							className="pl-9"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
					</div>
					{filtered.length ? (
						<ul className="max-h-44 space-y-1 overflow-y-auto">
							{filtered.map((item: Item) => {
								const selected =
									origin?.kind === "copy" && origin.fromItemId === item.id;
								return (
									<li key={item.id}>
										<button
											type="button"
											aria-pressed={selected}
											onClick={() => onCopy(copyItemMechanics(item))}
											className={cn(
												"flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-left text-[13px] transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
												selected && "bg-primary/10 text-primary",
											)}
										>
											<span className="truncate">
												{item.name || "Sem nome"}
											</span>
											<span className="shrink-0 text-[11px] text-muted-foreground">
												{item.type}
											</span>
										</button>
									</li>
								);
							})}
						</ul>
					) : (
						<p className="px-1 py-2 text-[12px] text-muted-foreground">
							{visible.length
								? "Nenhum item com esse nome."
								: "Ainda não há itens nesta campanha para copiar."}
						</p>
					)}
				</div>
			) : null}
		</FormSection>
	);
}
