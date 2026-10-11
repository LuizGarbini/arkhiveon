import { useNavigate } from "@tanstack/react-router";
import { Info, Pencil, Plus, XIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useToast } from "@/components/ui/toast";
import {
	describeItemLine,
	emptyArmorStats,
	emptyWeaponStats,
	type ItemFormTabId,
	itemCategoryKind,
	tabStatus,
	validateItemDraft,
} from "@/core/rules/item-mechanics";
import { useAuth } from "@/lib/auth";
import { resolveItemImageUrl } from "@/lib/character-images";
import type { Item } from "@/lib/store";
import {
	itemDefaults,
	useActiveCampaignRole,
	useImageAssetLookup,
	useIsWorldStaff,
	useRPGStore,
} from "@/lib/store";
import {
	canCreateCampaignItem,
	canManageOwnItem,
} from "@/lib/worldbuilding/item-ownership";
import type { ItemFormValues } from "./item-form/item-form-controls";
import { buildItemTabs, ItemFormSidebar } from "./item-form/item-form-sidebar";
import { ItemIdentityTab } from "./item-form/item-identity-tab";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";

export function ItemForm() {
	const role = useActiveCampaignRole();
	if (!canCreateCampaignItem(role)) return null;
	return (
		<ItemFormDialog
			trigger={
				<Button
					variant="default"
					size="sm"
					aria-keyshortcuts="Alt+N"
					data-shortcut-action="new"
				>
					<Plus className="h-3.5 w-3.5" />
					Novo Item
				</Button>
			}
		/>
	);
}

interface ItemEditButtonProps {
	item: Item;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
}

export function ItemEditButton({
	item,
	open,
	onOpenChange,
	trigger,
}: ItemEditButtonProps) {
	const { user } = useAuth();
	const isStaff = useIsWorldStaff();
	if (!canManageOwnItem(item, user?.id, isStaff)) return null;
	return (
		<ItemFormDialog
			item={item}
			open={open}
			onOpenChange={onOpenChange}
			trigger={
				trigger === undefined ? (
					<Button variant="ghost" size="sm">
						<Pencil className="h-3.5 w-3.5" />
						Editar
					</Button>
				) : (
					trigger
				)
			}
		/>
	);
}

interface ItemFormDialogProps {
	item?: Item;
	trigger?: ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

/**
 * Desktop: Dialog ~920 px com coluna lateral e uma aba por vez.
 * Mobile (< sm): sheet de altura cheia ancorado embaixo, sem X, footer fixo.
 */
const DIALOG_LAYOUT =
	"flex flex-col gap-0 overflow-hidden p-0 h-[min(85vh,720px)] w-[calc(100%-2rem)] sm:max-w-[920px]";

function ItemFormDialog({
	item,
	trigger,
	open: openProp,
	onOpenChange,
}: ItemFormDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const open = openProp ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger && <DialogTrigger render={trigger as React.ReactElement} />}
			<DialogContent className={DIALOG_LAYOUT} showCloseButton={false}>
				{open && (
					<ItemFormContent
						key={item?.id ?? "new"}
						item={item}
						setOpen={setOpen}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

interface ItemFormContentProps {
	item?: Item;
	setOpen: (open: boolean) => void;
}

const TAB_SUBTITLES: Record<ItemFormTabId, string> = {
	identity: "Nome, imagem e classificação.",
	mechanics: "Como a arma ataca e quanto dano causa.",
	bonus: "O que o item soma em quem o usa.",
	description: "História, sintonização, publicação e conexões.",
};

function ItemFormContent({ item, setOpen }: ItemFormContentProps) {
	const isEdit = Boolean(item);
	const mode = isEdit ? "edit" : "create";
	const toast = useToast();

	const addItem = useRPGStore((state) => state.addItem);
	const updateItem = useRPGStore((state) => state.updateItem);
	const activeCampaignId = useRPGStore((state) => state.activeCampaignId);
	const navigate = useNavigate();
	const { user } = useAuth();
	const imageAssets = useImageAssetLookup();

	const initialCampaignIds = activeCampaignId ? [activeCampaignId] : [];
	const [activeTab, setActiveTab] = useState<ItemFormTabId>("identity");

	const form = useForm<ItemFormValues>({
		defaultValues: item
			? {
					...itemDefaults,
					...item,
					campaignIds: item.campaignIds?.length
						? item.campaignIds
						: initialCampaignIds,
				}
			: {
					...itemDefaults,
					campaignIds: initialCampaignIds,
					type: "Arma",
					weapon: emptyWeaponStats(),
					bonuses: [],
					origin: { kind: "blank" },
				},
	});
	const {
		handleSubmit,
		control,
		setValue,
		getValues,
		formState: { isSubmitting },
	} = form;

	const watched = useWatch({ control }) as ItemFormValues;
	const name = watched.name ?? "";
	const kind = itemCategoryKind(watched.type);
	const tabs = buildItemTabs(kind);
	const currentTab: ItemFormTabId =
		activeTab === "mechanics" && kind === "other" ? "identity" : activeTab;
	const statuses = tabStatus(watched, mode);
	const { errors: _errors } = validateItemDraft(watched);
	const canSubmit = Boolean(name.trim());
	const imageSrc =
		resolveItemImageUrl(
			{
				imageUrl: watched.imageUrl ?? "",
				imageAssetId: watched.imageAssetId,
			} as Item,
			imageAssets,
		) || undefined;

	const placeholderName = kind === "weapon" ? "Arma sem nome" : "Item sem nome";
	const title = isEdit
		? kind === "weapon"
			? "Editar arma"
			: "Editar item"
		: kind === "weapon"
			? "Criar arma personalizada"
			: "Novo item";
	const subtitle =
		currentTab === "identity" && !isEdit && kind === "weapon"
			? "Comece pelo nome e pela imagem. Dano e propriedades ficam na aba Ataque."
			: currentTab === "mechanics" && kind === "armor"
				? "Quanto a armadura protege."
				: TAB_SUBTITLES[currentTab];

	function handleCategoryChange(type: string) {
		setValue("type", type, { shouldDirty: true });
		const nextKind = itemCategoryKind(type);
		const values = getValues();
		if (nextKind === "weapon" && !values.weapon)
			setValue("weapon", emptyWeaponStats(), { shouldDirty: true });
		if (nextKind === "armor" && !values.armor)
			setValue("armor", emptyArmorStats(type === "Escudo"), {
				shouldDirty: true,
			});
	}

	function onSubmit(data: ItemFormValues) {
		const check = validateItemDraft(data);
		if (!check.ok) {
			setActiveTab(check.errors.name ? "identity" : "mechanics");
			return;
		}
		const dataKind = itemCategoryKind(data.type);
		const payload: ItemFormValues = {
			...data,
			weapon:
				dataKind === "weapon" && data.weapon
					? {
							...data.weapon,
							customProperties: data.weapon.customProperties.filter(Boolean),
						}
					: undefined,
			armor: dataKind === "armor" ? data.armor : undefined,
			bonuses: data.bonuses?.length ? data.bonuses : undefined,
		};
		let createdId: string | null = null;
		if (isEdit && item) {
			updateItem(item.id, payload, user?.id);
			const syncError = useRPGStore.getState().syncError;
			if (syncError) {
				toast.error({
					title: "Erro ao atualizar item",
					description: syncError,
				});
				return;
			}
		} else {
			const created = addItem(payload, user?.id);
			if (created?.id) {
				createdId = created.id;
			} else {
				const syncError = useRPGStore.getState().syncError;
				toast.error({
					title: "Erro ao criar item",
					description:
						syncError ||
						"Não foi possível salvar o item. Verifique se você possui uma campanha ativa vinculada a um Mundo.",
				});
				return;
			}
		}
		setOpen(false);
		if (createdId) {
			void navigate({
				to: "/items/$itemId",
				params: { itemId: createdId },
				search: { edit: true },
			});
		}
	}

	const footerMessage = !canSubmit
		? `Dê um nome para criar ${kind === "weapon" ? "a arma" : "o item"}.`
		: null;

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="flex h-full min-h-0 flex-col"
		>
			<div className="flex min-h-0 flex-1 border-t border-border/60 sm:border-t-0">
				<ItemFormSidebar
					name={name}
					placeholderName={placeholderName}
					line={describeItemLine(watched)}
					category={watched.type ?? ""}
					rarity={watched.rarity ?? "comum"}
					imageSrc={imageSrc}
					tabs={tabs}
					activeTab={currentTab}
					onTabChange={setActiveTab}
					statuses={statuses}
					kind={kind}
					weapon={watched.weapon}
					armor={watched.armor}
				/>
				<div className="flex min-w-0 flex-1 flex-col">
					<DialogHeader className="relative shrink-0 gap-1 border-b border-border/60 max-sm:sr-only sm:px-6 sm:pt-5 sm:pb-4">
						<DialogTitle className="font-display text-lg">{title}</DialogTitle>
						<DialogDescription className="text-[13px]">
							{subtitle}
						</DialogDescription>
						<DialogClose
							render={
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									className="absolute top-4 right-4 hidden text-muted-foreground/80 hover:bg-muted/50 hover:text-foreground sm:inline-flex"
								/>
							}
						>
							<XIcon />
							<span className="sr-only">Fechar</span>
						</DialogClose>
					</DialogHeader>

					<div
						className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
						data-testid={`item-tab-${currentTab}`}
					>
						{currentTab === "identity" ? (
							<ItemIdentityTab
								form={form}
								mode={mode}
								onCategoryChange={handleCategoryChange}
							/>
						) : null}
						{currentTab !== "identity" ? (
							<p className="text-[13px] text-muted-foreground">
								Em construção.
							</p>
						) : null}
					</div>

					<div className="flex shrink-0 items-center gap-3 border-t border-border/60 bg-card-elevated/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
						{footerMessage ? (
							<p
								className="hidden items-center gap-1.5 text-[12px] text-muted-foreground sm:flex"
								aria-live="polite"
							>
								<Info className="h-3.5 w-3.5 text-primary" />
								{footerMessage}
							</p>
						) : null}
						<div className="flex flex-1 items-center gap-2 sm:flex-none sm:ml-auto">
							<Button
								type="button"
								variant="outline"
								className="h-12 flex-1 sm:h-9 sm:flex-none"
								onClick={() => setOpen(false)}
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								className="h-12 flex-1 sm:h-9 sm:flex-none"
								disabled={!canSubmit}
								title={footerMessage ?? undefined}
								loading={isSubmitting}
								loadingText="Salvando..."
							>
								<span className="sm:hidden">{isEdit ? "Salvar" : "Criar"}</span>
								<span className="hidden sm:inline">
									{isEdit
										? "Salvar alterações"
										: kind === "weapon"
											? "Criar arma"
											: "Criar item"}
								</span>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</form>
	);
}
