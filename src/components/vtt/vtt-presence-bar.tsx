import {
	Check,
	Crown,
	MousePointer2,
	MousePointerBan,
	Palette,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
	CURSOR_COLOR_NAMES,
	normalizeCursorColor,
	readableTextColor,
} from "@/lib/vtt/cursor-color";
import type { VTTPresenceUser } from "@/lib/vtt/types";
import { useVTTStore, VTT_PLAYER_COLORS } from "@/lib/vtt/vtt-store";

interface VTTPresenceBarProps {
	onFocusPoint?: (x: number, y: number) => void;
}

const focusRing =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/** Espera da cor livre: o seletor nativo dispara a cada arrasto. */
const FREE_COLOR_COMMIT_MS = 250;

export function VTTPresenceBar({ onFocusPoint }: VTTPresenceBarProps) {
	const { user } = useAuth();
	const onlineUsers = useVTTStore((s) => s.onlineUsers);
	const userColor = useVTTStore((s) => s.userColor);
	const userColorChosen = useVTTStore((s) => s.userColorChosen);
	const showRemoteCursors = useVTTStore((s) => s.showRemoteCursors);
	const remoteCursors = useVTTStore((s) => s.remoteCursors);
	const tokens = useVTTStore((s) => s.tokens);
	const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
	// Cor livre em escolha: mostra na hora e só grava quando o arrasto sossega.
	const [draftColor, setDraftColor] = useState<string | null>(null);
	const freeColorId = useId();
	const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const myName =
		user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Você";
	const shownColor = draftColor ?? userColor;
	const isPaletteColor = VTT_PLAYER_COLORS.some((c) => c === userColor);

	const handleUserClick = (u: VTTPresenceUser) => {
		const cursor = remoteCursors[u.userId];
		if (cursor && onFocusPoint) {
			onFocusPoint(cursor.x, cursor.y);
			return;
		}

		const token = tokens.find((t) => t.controlledBy.includes(u.userId));
		if (token && onFocusPoint) {
			onFocusPoint(token.x, token.y);
		}
	};

	const chooseColor = (color: string) => {
		if (!user) return;
		useVTTStore.getState().chooseUserColor(user.id, color);
	};

	const handleFreeColor = (value: string) => {
		const color = normalizeCursorColor(value);
		if (!color) return;
		setDraftColor(color);
		if (commitTimer.current) clearTimeout(commitTimer.current);
		commitTimer.current = setTimeout(() => {
			chooseColor(color);
			setDraftColor(null);
			commitTimer.current = null;
		}, FREE_COLOR_COMMIT_MS);
	};

	const handleAuto = () => {
		if (!user) return;
		if (commitTimer.current) clearTimeout(commitTimer.current);
		commitTimer.current = null;
		setDraftColor(null);
		const others = useVTTStore
			.getState()
			.onlineUsers.filter((u) => u.userId !== user.id);
		useVTTStore.getState().resetUserColor(user.id, others);
	};

	return (
		<div className="flex items-center gap-1 pl-3 select-none">
			<span className="flex items-center gap-1.5 pr-1 text-xs text-muted-foreground tabular-nums">
				<span
					aria-hidden
					className={cn(
						"size-1.5 rounded-full",
						onlineUsers.length > 0 ? "bg-primary" : "bg-muted-foreground/60",
					)}
				/>
				{onlineUsers.length} online
			</span>

			{/* Connected Avatars Stack */}
			<div className="flex items-center -space-x-1.5 overflow-hidden py-0.5 max-w-[180px] sm:max-w-[260px]">
				{onlineUsers.map((u) => (
					<button
						type="button"
						key={u.userId}
						onClick={() => handleUserClick(u)}
						title={`${u.userName} ${u.isGM ? "(Mestre)" : ""}`}
						style={{ borderColor: u.color }}
						className={cn(
							"relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 bg-card-elevated transition-transform duration-150 [@media(hover:hover)]:hover:z-20 [@media(hover:hover)]:hover:-translate-y-0.5",
							focusRing,
						)}
					>
						{u.avatarUrl ? (
							<img
								src={u.avatarUrl}
								alt={u.userName}
								className="h-full w-full object-cover"
							/>
						) : (
							<div
								style={{ backgroundColor: `${u.color}33`, color: u.color }}
								className="h-full w-full flex items-center justify-center text-[10px] font-bold"
							>
								{u.userName.slice(0, 2).toUpperCase()}
							</div>
						)}

						{u.isGM && (
							<div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-xs">
								<Crown className="h-2 w-2 fill-black" />
							</div>
						)}
					</button>
				))}
			</div>

			{/* Preferência local: mostrar ou não o ponteiro com nome dos outros.
			    Pings, réguas, moldes e tokens arrastados continuam aparecendo. */}
			<button
				type="button"
				aria-pressed={showRemoteCursors}
				aria-label="Cursores dos outros integrantes"
				title={
					showRemoteCursors
						? "Cursores dos outros: visíveis. Toque para ocultar (pings e réguas continuam aparecendo)."
						: "Cursores dos outros: ocultos. Toque para mostrar."
				}
				onClick={() =>
					useVTTStore.getState().setShowRemoteCursors(!showRemoteCursors)
				}
				className={cn(
					"flex size-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-xl transition-[background-color,color,transform] duration-150 active:scale-[0.98]",
					focusRing,
					showRemoteCursors
						? "text-foreground [@media(hover:hover)]:hover:bg-accent"
						: "bg-muted text-muted-foreground [@media(hover:hover)]:hover:bg-accent",
				)}
			>
				{showRemoteCursors ? (
					<MousePointer2 className="size-4" aria-hidden />
				) : (
					<MousePointerBan className="size-4" aria-hidden />
				)}
				<span aria-live="polite" className="sr-only">
					{showRemoteCursors
						? "Cursores dos outros visíveis"
						: "Cursores dos outros ocultos"}
				</span>
			</button>

			{/* Minha cor de cursor, ping e régua */}
			<Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
				<PopoverTrigger
					aria-label="Alterar a cor do meu cursor"
					title="Alterar a cor do meu cursor, ping e régua"
					className={cn(
						"flex size-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-xl transition-[background-color,transform] duration-150 active:scale-[0.98] [@media(hover:hover)]:hover:bg-accent",
						focusRing,
					)}
				>
					<span
						style={{ backgroundColor: userColor }}
						className="size-4 rounded-full border border-border"
					/>
				</PopoverTrigger>
				<PopoverContent
					side="bottom"
					align="end"
					className="vtt-dialog w-80 max-w-[calc(100vw-1rem)] p-3 rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl gap-3"
				>
					<div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-bold">
						<Palette className="h-3.5 w-3.5 text-primary" />
						<span>Cor do seu cursor</span>
					</div>

					{/* Como os outros te veem */}
					<div className="flex items-center gap-2 rounded-xl bg-background/60 px-3 py-2 ring-1 ring-inset ring-border/70">
						<MousePointer2
							className="size-4 shrink-0"
							style={{ color: shownColor, fill: shownColor }}
							aria-hidden
						/>
						<span
							style={{
								backgroundColor: shownColor,
								color: readableTextColor(shownColor),
							}}
							className="max-w-40 truncate rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
						>
							{myName}
						</span>
						<span className="ml-auto text-[11px] text-muted-foreground">
							{userColorChosen ? "Escolhida" : "Automática"}
						</span>
					</div>

					<div className="grid grid-cols-6 gap-1">
						{VTT_PLAYER_COLORS.map((c) => {
							const selected = userColorChosen && userColor === c;
							return (
								<button
									type="button"
									key={c}
									aria-label={CURSOR_COLOR_NAMES[c] ?? c}
									aria-pressed={selected}
									title={CURSOR_COLOR_NAMES[c]}
									onClick={() => {
										setDraftColor(null);
										chooseColor(c);
									}}
									className={cn(
										"flex size-11 cursor-pointer touch-manipulation items-center justify-center rounded-xl transition-[transform,box-shadow] duration-150 active:scale-[0.98] [@media(hover:hover)]:hover:scale-105",
										focusRing,
										selected &&
											"ring-2 ring-primary ring-offset-2 ring-offset-background",
									)}
									style={{ backgroundColor: c }}
								>
									{selected && (
										<Check
											className="size-4"
											style={{ color: readableTextColor(c) }}
											aria-hidden
										/>
									)}
								</button>
							);
						})}
					</div>

					<div className="flex items-center gap-2">
						<label
							htmlFor={freeColorId}
							className={cn(
								"flex min-h-11 flex-1 cursor-pointer items-center gap-2 rounded-xl bg-background/60 px-3 text-xs text-foreground ring-1 ring-inset ring-border/70 transition-colors duration-150 [@media(hover:hover)]:hover:bg-accent",
								userColorChosen &&
									!isPaletteColor &&
									"ring-2 ring-primary ring-inset",
							)}
						>
							<input
								id={freeColorId}
								type="color"
								value={shownColor}
								onChange={(event) => handleFreeColor(event.target.value)}
								className="size-6 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0"
							/>
							Cor livre
						</label>
						<button
							type="button"
							aria-pressed={!userColorChosen}
							onClick={handleAuto}
							className={cn(
								"min-h-11 cursor-pointer touch-manipulation rounded-xl px-3 text-xs font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98]",
								focusRing,
								userColorChosen
									? "bg-card-elevated text-foreground [@media(hover:hover)]:hover:bg-accent"
									: "bg-primary/15 text-primary",
							)}
						>
							Automática
						</button>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
