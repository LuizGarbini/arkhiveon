import { Crown, Palette } from "lucide-react";
import { useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { VTTPresenceUser } from "@/lib/vtt/types";
import { VTT_PLAYER_COLORS, useVTTStore } from "@/lib/vtt/vtt-store";
import { cn } from "@/lib/utils";

interface VTTPresenceBarProps {
	onFocusPoint?: (x: number, y: number) => void;
}

export function VTTPresenceBar({ onFocusPoint }: VTTPresenceBarProps) {
	const { onlineUsers, userColor, setUserColor, remoteCursors, tokens } = useVTTStore();
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
		<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-lg select-none">
			{/* Online Presence Count Indicator */}
			<div className="flex items-center gap-1.5 pr-2 border-r border-white/10 text-white/70">
				<div className="relative flex h-2 w-2">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
					<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
				</div>
				<span className="text-[11px] font-mono font-bold text-white">
					{Math.max(1, onlineUsers.length)}
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
							"relative h-7 w-7 rounded-full border-2 bg-zinc-900 overflow-hidden shrink-0 transition-transform hover:scale-125 hover:z-20 cursor-pointer shadow-md",
						)}
					>
						{u.avatarUrl ? (
							<img src={u.avatarUrl} alt={u.userName} className="h-full w-full object-cover" />
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
					style={{ backgroundColor: userColor }}
					title="Alterar Minha Cor de Ping e Cursor"
					className="h-5 w-5 rounded-full border border-white/40 shadow-xs hover:scale-110 active:scale-95 transition-all cursor-pointer ml-1 inline-block"
				/>
				<PopoverContent
					side="bottom"
					align="end"
					className="w-44 p-2.5 rounded-2xl border border-white/15 bg-black/90 backdrop-blur-xl shadow-2xl space-y-2"
				>
					<div className="flex items-center gap-1.5 text-white/70 text-[11px] font-bold">
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
									"h-7 w-7 rounded-xl transition-all cursor-pointer",
									userColor === c
										? "ring-2 ring-white ring-offset-2 ring-offset-black scale-105"
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
