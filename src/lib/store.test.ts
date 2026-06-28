// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { useRPGStore } from "./store";

describe("Zustand Store Persistence Partialization", () => {
	beforeEach(() => {
		// Clear local storage and reset the store state before each test
		localStorage.clear();
		useRPGStore.setState({
			activeCampaignId: null,
			campaigns: [],
			spotifyJamLink: null,
			spotifyJamActive: false,
			spotifyToken: null,
			spotifyUser: null,
		});
	});

	it("keeps spotifyToken in memory but excludes it from localStorage persistence", () => {
		// Set spotify auth token and user info
		useRPGStore.getState().setSpotifyAuth("mock-spotify-token", {
			name: "Test Spotify User",
		});

		// Verify in-memory state is updated
		const inMemoryState = useRPGStore.getState();
		expect(inMemoryState.spotifyToken).toBe("mock-spotify-token");
		expect(inMemoryState.spotifyUser?.name).toBe("Test Spotify User");

		// Fetch the persisted storage string from localStorage
		const persistedStr = localStorage.getItem("arkhiveon-storage");
		expect(persistedStr).toBeDefined();
		expect(persistedStr).not.toBeNull();

		const parsed = JSON.parse(persistedStr!);
		expect(parsed.state).toBeDefined();

		// Verify that active campaign and jam info are in the persisted state structure
		expect(parsed.state).toHaveProperty("activeCampaignId");
		expect(parsed.state).toHaveProperty("campaigns");

		// Crucially, verify that spotifyToken and spotifyUser are NOT persisted
		expect(parsed.state.spotifyToken).toBeUndefined();
		expect(parsed.state.spotifyUser).toBeUndefined();
	});

	it("clears spotifyToken and spotifyUser from memory on logout", () => {
		// Set values first
		useRPGStore.getState().setSpotifyAuth("mock-spotify-token", {
			name: "Test Spotify User",
		});

		expect(useRPGStore.getState().spotifyToken).toBe("mock-spotify-token");

		// Trigger logout
		useRPGStore.getState().logoutSpotify();

		// Verify both are cleared in memory
		expect(useRPGStore.getState().spotifyToken).toBeNull();
		expect(useRPGStore.getState().spotifyUser).toBeNull();
	});
});
