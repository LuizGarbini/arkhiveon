import type { StateCreator } from "zustand";
import type { RPGState } from "./types";

export interface SpotifySlice {
	spotifyJamLink: string | null;
	spotifyJamActive: boolean;
	spotifyToken: string | null;
	spotifyRefreshToken: string | null;
	spotifyExpiresAt: number | null;
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
		user?: { name: string; email?: string; image?: string } | null,
		refreshToken?: string | null,
		expiresIn?: number,
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
	spotifyRefreshToken: null,
	spotifyExpiresAt: null,
	spotifyUser: null,
	currentTrack: null,
	jamParticipants: [],
	setSpotifyJam: (link) =>
		set((state) => {
			if (state.spotifyJamLink === link && state.spotifyJamActive === !!link) {
				return state;
			}
			return { spotifyJamLink: link, spotifyJamActive: !!link };
		}),
	clearSpotifyJam: () =>
		set((state) => {
			if (state.spotifyJamLink === null && !state.spotifyJamActive) {
				return state;
			}
			return { spotifyJamLink: null, spotifyJamActive: false };
		}),
	setSpotifyAuth: (token, user, refreshToken, expiresIn) =>
		set((state) => {
			const nextUser = user !== undefined ? user : state.spotifyUser;
			const nextRefreshToken =
				refreshToken !== undefined ? refreshToken : state.spotifyRefreshToken;
			const nextExpiresAt =
				typeof expiresIn === "number"
					? Date.now() + expiresIn * 1000
					: state.spotifyExpiresAt;

			if (
				state.spotifyToken === token &&
				state.spotifyRefreshToken === nextRefreshToken &&
				state.spotifyExpiresAt === nextExpiresAt &&
				state.spotifyUser?.name === nextUser?.name &&
				state.spotifyUser?.email === nextUser?.email &&
				state.spotifyUser?.image === nextUser?.image
			) {
				return state;
			}

			return {
				spotifyToken: token,
				spotifyUser: nextUser,
				spotifyRefreshToken: nextRefreshToken,
				spotifyExpiresAt: nextExpiresAt,
			};
		}),
	logoutSpotify: () =>
		set((state) => {
			if (
				!state.spotifyToken &&
				!state.spotifyRefreshToken &&
				!state.spotifyExpiresAt &&
				!state.spotifyUser &&
				!state.currentTrack
			) {
				return state;
			}
			return {
				spotifyToken: null,
				spotifyRefreshToken: null,
				spotifyExpiresAt: null,
				spotifyUser: null,
				currentTrack: null,
			};
		}),
	setCurrentTrack: (track) =>
		set((state) => {
			const prev = state.currentTrack;
			if (
				prev === track ||
				(prev &&
					track &&
					prev.title === track.title &&
					prev.artist === track.artist &&
					prev.albumArt === track.albumArt &&
					prev.isPlaying === track.isPlaying)
			) {
				return state;
			}
			return { currentTrack: track };
		}),
	setJamParticipants: (participants) =>
		set((state) => {
			const prev = state.jamParticipants;
			if (prev.length === participants.length) {
				const isSame = prev.every(
					(p, i) =>
						p.id === participants[i]?.id &&
						p.name === participants[i]?.name &&
						p.image === participants[i]?.image,
				);
				if (isSame) return state;
			}
			return { jamParticipants: participants };
		}),
});
