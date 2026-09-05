import { Crown, Palette, Users } from "lucide-react";
import { useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { VTTPresenceUser } from "@/lib/vtt/types";
import { useVTTStore, VTT_PLAYER_COLORS } from "@/lib/vtt/vtt-store";
import {
	vttFocusRingClass,
	vttHudClass,
	vttIconButtonClass,
} from "./vtt-chrome";

interface VTTPresenceBarProps {
	onFocusPoint?: (x: number, y: number) => void;
}

export function VTTPresenceBar({ onFocusPoint }: VTTPresenceBarProps) {
	const { onlineUsers, userColor, setUserColor, remoteCursors, tokens } =
		useVTTStore();
	const [isOpen, setIsOpen] = useState(false);
	const count = Math.max(1, onlineUsers.length);

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

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger
				title="Jogadores na mesa"
				className={cn(
					vttHudClass,
					vttFocusRingClass,
					"flex h-11 min-w-11 items-center gap-1.5 px-2.5 select-none",
					"transition-all duration-150 ease-out active:scale-[0.98]",
				)}
			>
				<div className="relative flex h-2 w-2">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
					<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
				</div>
				<Users className="h-3.5 w-3.5 text-muted-foreground" />
				<span className="font-mono text-sm font-bold tabular-nums text-foreground">
					{count}
				</span>
			</PopoverTrigger>
			<PopoverContent
				side="bottom"
				align="end"
				className="w-56 space-y-3 rounded-2xl border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur-md"
			>
				<div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
					<span>Na mesa</span>
					<span className="font-mono tabular-nums text-foreground">
						{count}
					</span>
				</div>

				<div className="flex flex-col gap-1">
					{onlineUsers.map((u) => (
						<button
							type="button"
							key={u.userId}
							onClick={() => handleUserClick(u)}
							title={`${u.userName} ${u.isGM ? "(Mestre)" : ""}`}
							className={cn(
								"flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left",
								"transition-all duration-150 ease-out active:scale-[0.98]",
								"[@media(hover:hover)]:hover:bg-muted",
								vttFocusRingClass,
							)}
						>
							<div
								style={{ borderColor: u.color }}
								className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 bg-card"
							>
								{u.avatarUrl ? (
									<img
										src={u.avatarUrl}
										alt=""
										className="h-full w-full object-cover"
									/>
								) : (
									<div
										style={{ backgroundColor: `${u.color}33`, color: u.color }}
										className="flex h-full w-full items-center justify-center text-[10px] font-bold"
									>
										{u.userName.slice(0, 2).toUpperCase()}
									</div>
								)}
								{u.isGM && (
									<div className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
										<Crown className="h-2 w-2" />
									</div>
								)}
							</div>
							<span className="min-w-0 truncate text-sm font-semibold text-foreground">
								{u.userName}
							</span>
						</button>
					))}
				</div>

				<div className="space-y-2 border-t border-border/60 pt-2">
					<div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
						<Palette className="h-3.5 w-3.5 text-primary" />
						<span>Cor do cursor</span>
					</div>
					<div className="grid grid-cols-4 gap-1.5">
						{VTT_PLAYER_COLORS.map((c) => (
							<button
								type="button"
								key={c}
								onClick={() => {
									setUserColor(c);
									setIsOpen(false);
								}}
								title="Alterar cor do ping e cursor"
								style={{ backgroundColor: c }}
								className={cn(
									vttIconButtonClass,
									"rounded-xl",
									userColor === c
										? "ring-2 ring-primary ring-offset-2 ring-offset-background"
										: "opacity-80 [@media(hover:hover)]:hover:opacity-100",
								)}
							/>
						))}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
