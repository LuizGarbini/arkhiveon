// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
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

		const parsed = JSON.parse(persistedStr || "{}");
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

	it("prevents unnecessary re-renders when setting identical Spotify track or participants", () => {
		const track = {
			title: "Song A",
			artist: "Artist A",
			albumArt: "https://example.com/art.jpg",
			isPlaying: true,
		};

		useRPGStore.getState().setCurrentTrack(track);
		const stateAfterFirstSet = useRPGStore.getState();

		// Set identical track data in a new object reference
		useRPGStore.getState().setCurrentTrack({
			title: "Song A",
			artist: "Artist A",
			albumArt: "https://example.com/art.jpg",
			isPlaying: true,
		});

		// State reference should be preserved (no spurious re-render)
		expect(useRPGStore.getState()).toBe(stateAfterFirstSet);

		// Set participants
		const participants = [{ id: "u1", name: "User 1", image: "img.jpg" }];
		useRPGStore.getState().setJamParticipants(participants);
		const stateAfterParticipants = useRPGStore.getState();

		// Set identical participants in new array reference
		useRPGStore
			.getState()
			.setJamParticipants([{ id: "u1", name: "User 1", image: "img.jpg" }]);
		expect(useRPGStore.getState()).toBe(stateAfterParticipants);
	});

	it("resets campaign bootstrap flag when clearing local data", () => {
		useRPGStore.setState({
			hasLoadedCampaigns: true,
			campaigns: [
				{
					id: "c1",
					name: "Campanha",
					description: "",
					ownerId: "u1",
					worldId: "w1",
					myRole: "owner",
					createdAt: Date.now(),
				},
			],
			activeCampaignId: "c1",
		});

		useRPGStore.getState().clearLocalData();

		const state = useRPGStore.getState();
		expect(state.hasLoadedCampaigns).toBe(false);
		expect(state.campaigns).toEqual([]);
		expect(state.activeCampaignId).toBeNull();
	});

	it("clearActiveCampaignEntities keeps campaigns and bootstrap flag", () => {
		useRPGStore.setState({
			hasLoadedCampaigns: true,
			campaigns: [
				{
					id: "c1",
					name: "Campanha",
					description: "",
					ownerId: "u1",
					worldId: "w1",
					myRole: "owner",
					createdAt: Date.now(),
				},
			],
			activeCampaignId: "c1",
			characters: [
				{
					id: "ch1",
					characterName: "A",
					createdAt: Date.now(),
				} as never,
			],
		});

		useRPGStore.getState().clearActiveCampaignEntities();

		const state = useRPGStore.getState();
		expect(state.hasLoadedCampaigns).toBe(true);
		expect(state.campaigns).toHaveLength(1);
		expect(state.characters).toEqual([]);
	});
});
