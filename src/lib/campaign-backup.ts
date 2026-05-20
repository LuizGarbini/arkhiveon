import type { RPGState } from "./store";

type BackupState = Pick<
	RPGState,
	| "characters"
	| "npcs"
	| "sessions"
	| "items"
	| "locations"
	| "lores"
	| "activityLog"
>;

export interface CampaignBackup extends BackupState {
	version: 1;
	exportedAt: string;
	app: "arkhiveon";
}

export function createCampaignBackup(state: BackupState): CampaignBackup {
	return {
		version: 1,
		app: "arkhiveon",
		exportedAt: new Date().toISOString(),
		characters: state.characters,
		npcs: state.npcs,
		sessions: state.sessions,
		items: state.items,
		locations: state.locations,
		lores: state.lores,
		activityLog: state.activityLog,
	};
}

export function downloadCampaignBackup(state: BackupState) {
	const backup = createCampaignBackup(state);
	const blob = new Blob([JSON.stringify(backup, null, 2)], {
		type: "application/json;charset=utf-8",
	});
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	const date = backup.exportedAt.slice(0, 10);
	anchor.href = url;
	anchor.download = `arkhiveon-backup-${date}.json`;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}
