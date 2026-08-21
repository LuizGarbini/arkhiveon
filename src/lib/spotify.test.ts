// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
	base64urlencode,
	formatTrackInfo,
	generateRandomString,
	getSpotifyRedirectUri,
	sha256,
} from "./spotify";

describe("Spotify Library Helpers", () => {
	it("generates a random string of requested length", () => {
		const str16 = generateRandomString(16);
		const str64 = generateRandomString(64);

		expect(str16).toHaveLength(16);
		expect(str64).toHaveLength(64);
		expect(str16).not.toEqual(generateRandomString(16));
	});

	it("computes sha256 and base64urlencode according to PKCE standards", async () => {
		const input = "test_code_verifier_12345";
		const hash = await sha256(input);
		expect(hash.byteLength).toBe(32);

		const encoded = base64urlencode(hash);
		expect(typeof encoded).toBe("string");
		expect(encoded.length).toBeGreaterThan(0);
		expect(encoded).not.toContain("+");
		expect(encoded).not.toContain("/");
		expect(encoded).not.toContain("=");
	});

	it("resolves default redirect URI when none is configured in environment", () => {
		const redirectUri = getSpotifyRedirectUri();
		expect(redirectUri).toContain("/spotify-callback");
	});

	describe("formatTrackInfo", () => {
		it("safely formats standard track payload", () => {
			const trackPayload = {
				name: "Tavern Song",
				artists: [{ name: "Bardic Inspiration" }, { name: "Lute Master" }],
				album: {
					images: [{ url: "https://example.com/album.jpg" }],
				},
			};

			const result = formatTrackInfo(trackPayload, true);
			expect(result).toEqual({
				title: "Tavern Song",
				artist: "Bardic Inspiration, Lute Master",
				albumArt: "https://example.com/album.jpg",
				isPlaying: true,
			});
		});

		it("safely formats podcast / episode payload without artists or album properties", () => {
			const podcastPayload = {
				name: "Episode 42: The Dragon's Lair",
				show: {
					name: "Critical Role & RPG Lore",
				},
				images: [{ url: "https://example.com/episode.jpg" }],
			};

			const result = formatTrackInfo(podcastPayload, false);
			expect(result).toEqual({
				title: "Episode 42: The Dragon's Lair",
				artist: "Critical Role & RPG Lore",
				albumArt: "https://example.com/episode.jpg",
				isPlaying: false,
			});
		});

		it("handles payload with missing fields gracefully", () => {
			const minimalPayload = {
				name: "Mystery Track",
			};

			const result = formatTrackInfo(minimalPayload, true);
			expect(result).toEqual({
				title: "Mystery Track",
				artist: "Artista desconhecido",
				albumArt: undefined,
				isPlaying: true,
			});
		});

		it("returns null for nullish payloads", () => {
			expect(formatTrackInfo(null)).toBeNull();
			expect(formatTrackInfo(undefined)).toBeNull();
		});
	});
});
