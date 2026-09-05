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
import { vttHudClass } from "./vtt-chrome";

interface VTTPresenceBarProps {
	onFocusPoint?: (x: number, y: number) => void;
}

export function VTTPresenceBar({ onFocusPoint }: VTTPresenceBarProps) {
	const { onlineUsers, userColor, setUserColor, remoteCursors, tokens } =
		useVTTStore();
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
		<div
			className={cn(
				vttHudClass,
				"flex min-h-11 items-center gap-1.5 px-2.5 py-1 select-none",
			)}
		>
			<div className="flex items-center gap-1.5 border-r border-border/70 pr-2 text-muted-foreground">
				<div className="relative flex h-2 w-2">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
					<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
				</div>
				<span className="font-mono text-[11px] font-bold text-foreground">
					{Math.max(1, onlineUsers.length)}
				</span>
			</div>

			<div className="flex max-w-[180px] items-center -space-x-1.5 overflow-hidden py-0.5 sm:max-w-[260px]">
				{onlineUsers.map((u) => (
					<button
						type="button"
						key={u.userId}
						onClick={() => handleUserClick(u)}
						title={`${u.userName} ${u.isGM ? "(Mestre)" : ""}`}
						style={{ borderColor: u.color }}
						className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 bg-card shadow-md transition-all duration-150 ease-out hover:z-20 hover:scale-110 active:scale-[0.98] cursor-pointer"
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
								className="flex h-full w-full items-center justify-center text-[10px] font-bold"
							>
								{u.userName.slice(0, 2).toUpperCase()}
							</div>
						)}

						{u.isGM && (
							<div className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
								<Crown className="h-2.5 w-2.5" />
							</div>
						)}
					</button>
				))}
			</div>

			<Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
				<PopoverTrigger
					style={{ backgroundColor: userColor }}
					title="Alterar Minha Cor de Ping e Cursor"
					className="ml-1 inline-flex h-11 w-11 cursor-pointer rounded-full border border-border/70 shadow-xs transition-all duration-150 ease-out hover:scale-105 active:scale-[0.98]"
				/>
				<PopoverContent
					side="bottom"
					align="end"
					className="w-44 space-y-2 rounded-2xl border border-border/70 bg-card/95 p-2.5 shadow-2xl backdrop-blur-md"
				>
					<div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
						<Palette className="h-3.5 w-3.5 text-primary" />
						<span>Cor do seu Cursor</span>
					</div>
					<div className="grid grid-cols-4 gap-1.5">
						{VTT_PLAYER_COLORS.map((c) => (
							<button
								type="button"
								key={c}
								onClick={() => {
									setUserColor(c);
									setIsColorPickerOpen(false);
								}}
								style={{ backgroundColor: c }}
								className={cn(
									"h-11 w-11 cursor-pointer rounded-xl transition-all duration-150 ease-out active:scale-[0.98]",
									userColor === c
										? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
										: "opacity-80 hover:scale-105 hover:opacity-100",
								)}
							/>
						))}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
