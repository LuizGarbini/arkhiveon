import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useWorldCampaigns } from "@/lib/worldbuilding/hooks";
import type {
	EntityVisibility,
	PublicationScope,
} from "@/lib/worldbuilding/visibility";

interface PublicationScopeFieldsProps {
	publicationScope: PublicationScope;
	visibility: EntityVisibility;
	campaignIds: string[];
	onPublicationScopeChange: (value: PublicationScope) => void;
	onVisibilityChange: (value: EntityVisibility) => void;
	onCampaignIdsChange: (ids: string[]) => void;
	disabled?: boolean;
	scopeLabel?: string;
}

export function PublicationScopeFields({
	publicationScope,
	visibility,
	campaignIds,
	onPublicationScopeChange,
	onVisibilityChange,
	onCampaignIdsChange,
	disabled = false,
	scopeLabel = "Escopo de publicação",
}: PublicationScopeFieldsProps) {
	const worldCampaigns = useWorldCampaigns();

	function toggleCampaign(campaignId: string) {
		if (campaignIds.includes(campaignId)) {
			onCampaignIdsChange(campaignIds.filter((id) => id !== campaignId));
			return;
		}
		onCampaignIdsChange([...campaignIds, campaignId]);
	}

	return (
		<div className="space-y-4 rounded-xl border border-border/70 bg-card-elevated/30 p-4">
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label>{scopeLabel}</Label>
					<Select
						value={publicationScope}
						disabled={disabled}
						onChange={(e) =>
							onPublicationScopeChange(e.target.value as PublicationScope)
						}
					>
						<option value="global">Global (todo o Mundo)</option>
						<option value="restricted">
							Restrito (campanhas selecionadas)
						</option>
					</Select>
				</div>
				<div className="space-y-2">
					<Label>Visibilidade</Label>
					<Select
						value={visibility}
						disabled={disabled}
						onChange={(e) =>
							onVisibilityChange(e.target.value as EntityVisibility)
						}
					>
						<option value="public">Pública</option>
						<option value="master_secret">Segredo do Mestre</option>
					</Select>
				</div>
			</div>

			{publicationScope === "restricted" && (
				<div className="space-y-2">
					<Label>Campanhas</Label>
					<div className="flex flex-wrap gap-2">
						{worldCampaigns.map((campaign) => {
							const selected = campaignIds.includes(campaign.id);
							return (
								<button
									key={campaign.id}
									type="button"
									disabled={disabled}
									onClick={() => toggleCampaign(campaign.id)}
									className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
										selected
											? "border-primary bg-primary/15 text-primary"
											: "border-border/70 text-muted-foreground hover:text-foreground"
									}`}
								>
									{campaign.name}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
