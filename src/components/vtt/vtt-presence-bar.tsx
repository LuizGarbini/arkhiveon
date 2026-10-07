import { Crown, Palette } from "lucide-react";
import { useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { VTTPresenceUser } from "@/lib/vtt/types";
import { useVTTStore, VTT_PLAYER_COLORS } from "@/lib/vtt/vtt-store";

interface VTTPresenceBarProps {
	onFocusPoint?: (x: number, y: number) => void;
}

export function VTTPresenceBar({ onFocusPoint }: VTTPresenceBarProps) {
	const onlineUsers = useVTTStore((s) => s.onlineUsers);
	const userColor = useVTTStore((s) => s.userColor);
	const setUserColor = useVTTStore((s) => s.setUserColor);
	const remoteCursors = useVTTStore((s) => s.remoteCursors);
	const tokens = useVTTStore((s) => s.tokens);
	const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

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
		<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-lg select-none">
			{/* Online Presence Count Indicator */}
			<div className="flex items-center gap-1.5 pr-2 border-r border-border/70 text-muted-foreground">
				<div className="relative flex h-2 w-2">
					{onlineUsers.length > 0 && (
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
					)}
					<span
						className={cn(
							"relative inline-flex rounded-full h-2 w-2",
							onlineUsers.length > 0 ? "bg-primary" : "bg-muted-foreground",
						)}
					/>
				</div>
				<span className="text-[11px] font-mono font-bold text-foreground">
					{onlineUsers.length}
				</span>
			</div>

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
							"relative h-11 w-11 rounded-full border-2 bg-card-elevated overflow-hidden shrink-0 transition-transform hover:scale-125 hover:z-20 cursor-pointer shadow-md",
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

			{/* User Color Picker Popover */}
			<Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
				<PopoverTrigger
					aria-label="Alterar minha cor de ping e cursor"
					title="Alterar Minha Cor de Ping e Cursor"
					className="flex size-11 items-center justify-center rounded-xl hover:bg-accent active:scale-[0.98]"
				>
					<span
						style={{ backgroundColor: userColor }}
						className="size-4 rounded-full border border-border"
					/>
				</PopoverTrigger>
				<PopoverContent
					side="bottom"
					align="end"
					className="vtt-dialog w-60 p-2.5 rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl space-y-2"
				>
					<div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-bold">
						<Palette className="h-3.5 w-3.5 text-primary" />
						<span>Cor do seu Cursor</span>
					</div>
					<div className="grid grid-cols-4 gap-1.5">
						{VTT_PLAYER_COLORS.map((c) => (
							<button
								type="button"
								key={c}
								aria-label={`Usar cor ${c}`}
								onClick={() => {
									setUserColor(c);
									setIsColorPickerOpen(false);
								}}
								style={{ backgroundColor: c }}
								className={cn(
									"h-11 w-11 rounded-xl transition-all cursor-pointer",
									userColor === c
										? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
										: "hover:scale-105 opacity-80 hover:opacity-100",
								)}
							/>
						))}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
