import type { StateCreator } from "zustand";
import type { RPGState } from "./types";

export interface SpotifySlice {
	spotifyJamLink: string | null;
	spotifyJamActive: boolean;
	spotifyToken: string | null;
	spotifyUser: { name: string; email?: string; image?: string } | null;
	currentTrack: {
		title: string;
		artist: string;
		albumArt?: string;
		isPlaying: boolean;
	} | null;
	jamParticipants: { id: string; name: string; image?: string }[];
	setSpotifyJam: (link: string | null) => void;
	clearSpotifyJam: () => void;
	setSpotifyAuth: (
		token: string,
		user?: { name: string; email?: string; image?: string },
	) => void;
	logoutSpotify: () => void;
	setCurrentTrack: (
		track: {
			title: string;
			artist: string;
			albumArt?: string;
			isPlaying: boolean;
		} | null,
	) => void;
	setJamParticipants: (
		participants: { id: string; name: string; image?: string }[],
	) => void;
}

export const createSpotifySlice: StateCreator<
	RPGState,
	[],
	[],
	SpotifySlice
> = (set) => ({
	spotifyJamLink: null,
	spotifyJamActive: false,
	spotifyToken: null,
	spotifyUser: null,
	currentTrack: null,
	jamParticipants: [],
	setSpotifyJam: (link) =>
		set({ spotifyJamLink: link, spotifyJamActive: !!link }),
	clearSpotifyJam: () => set({ spotifyJamLink: null, spotifyJamActive: false }),
	setSpotifyAuth: (token, user) =>
		set({ spotifyToken: token, spotifyUser: user ?? null }),
	logoutSpotify: () => set({ spotifyToken: null, spotifyUser: null }),
	setCurrentTrack: (track) => set({ currentTrack: track }),
	setJamParticipants: (participants) => set({ jamParticipants: participants }),
});
