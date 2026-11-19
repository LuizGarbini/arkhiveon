import {
	Backpack,
	Coins,
	Link2,
	Pencil,
	Plus,
	Sword,
	Trash2,
	Warehouse,
} from "lucide-react";
import { useMemo, useState } from "react";
import { LinkCampaignItemDialog } from "@/components/character-sheet/link-campaign-item-dialog";
import {
	LinkedInventoryRow,
	LocationToggle,
} from "@/components/character-sheet/linked-inventory-row";
import {
	useCampaignItems,
	useCanLinkOnSheet,
} from "@/components/character-sheet/use-linked-items";
import { PartyLootDialog } from "@/components/party-loot-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
	ABILITY_LABELS,
	computeEffectiveStats,
	DAMAGE_TYPE_LABELS,
	DAMAGE_TYPES,
	normalizeWeaponAbility,
	parseDamageFormula,
	resolveLinkedEntries,
	WEAPON_ABILITIES,
} from "@/core/rules";
import {
	canRestockAmmo,
	isCatalogAmmoEntry,
	nextAmmoQuantity,
} from "@/core/rules/ammo";
import { applyLocalInventoryQuantity } from "@/lib/ammo/apply-local-qty";
import {
	AmmoConsumeError,
	AmmoConsumeOfflineError,
	AmmoConsumeUnavailableError,
	isAmmoRpcReady,
	setAmmoQuantity,
} from "@/lib/ammo/consume-ammo";
import { useActiveCampaignId, useActiveCampaignRole } from "@/lib/store";
import type {
	Character,
	DamageType,
	InventoryItem,
	InventoryWeaponExtraDamage,
	InventoryWeaponStats,
} from "@/lib/store/types";
import { cn } from "@/lib/utils";

interface CharacterInventoryModuleProps {
	character: Character;
	onUpdateCharacter: (patch: Partial<Character>) => void;
}

type InventoryCategory =
	| "weapon"
	| "armor"
	| "potion"
	| "gear"
	| "treasure"
	| "custom";

export function CharacterInventoryModule({
	character,
	onUpdateCharacter,
}: CharacterInventoryModuleProps) {
	const inventoryList = character.inventoryList || [];

	const [activeTab, setActiveTab] = useState<
		"all" | "equipped" | "backpack" | "mount_stash"
	>("all");
	const [isAdding, setIsAdding] = useState(false);

	const [name, setName] = useState("");
	const [quantity, setQuantity] = useState(1);
	const [weightLbs, setWeightLbs] = useState(1);
	const [location, setLocation] = useState<
		"equipped" | "backpack" | "mount_stash"
	>("backpack");
	const [category, setCategory] = useState<InventoryCategory>("gear");
	const [description, setDescription] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);

	// D&D 5e: dados de arma (só aparecem quando a categoria é Arma)
	const isDnd5e = character.system === "dnd5e";

	// Itens da campanha vinculados (vínculo vivo; o servidor confere quem pode).
	const campaignItems = useCampaignItems();
	const canLinkRule = useCanLinkOnSheet(character);
	const canLink = isDnd5e && canLinkRule;
	const toast = useToast();
	const role = useActiveCampaignRole();
	const campaignId = useActiveCampaignId();
	const restockAmmo = canRestockAmmo({
		rpcReady: isAmmoRpcReady(),
		role,
	});
	const [qtyBusyId, setQtyBusyId] = useState<string | null>(null);
	const [isLinking, setIsLinking] = useState(false);
	const linkedEntries = useMemo(
		() => resolveLinkedEntries(inventoryList, campaignItems.byId),
		[inventoryList, campaignItems.byId],
	);
	// Atributos e bônus de acerto/dano dos itens equipados: o acerto mostrado em
	// cada card tem de bater com a seção de ataques.
	const effectiveStats = useMemo(
		() => computeEffectiveStats(character, campaignItems.byId),
		[character, campaignItems.byId],
	);
	const patchEntry = (id: string, patch: Partial<InventoryItem>) => {
		onUpdateCharacter({
			inventoryList: inventoryList.map((i) =>
				i.id === id ? { ...i, ...patch } : i,
			),
		});
	};
	const [damageDice, setDamageDice] = useState("");
	const [damageType, setDamageType] = useState<DamageType>("slashing");
	const [weaponAbility, setWeaponAbility] =
		useState<InventoryWeaponStats["ability"]>("strength");
	const [magicBonus, setMagicBonus] = useState(0);
	const [proficient, setProficient] = useState(true);
	const [extraDamage, setExtraDamage] = useState<InventoryWeaponExtraDamage[]>(
		[],
	);
	const showWeaponFields = isDnd5e && category === "weapon";
	const damageDiceTrimmed = damageDice.trim();
	const parsedBase = damageDiceTrimmed
		? parseDamageFormula(damageDiceTrimmed)
		: null;
	const damageDiceInvalid =
		damageDiceTrimmed !== "" && (!parsedBase || parsedBase.dice.length === 0);

	// Cálculo de Carga D&D 5e (baseado em FOR)
	const strScore = character.strength || 10;
	const maxCapacity = strScore * 15;
	const encumberedThreshold = strScore * 5;
	const heavilyEncumberedThreshold = strScore * 10;

	const carriedItems = inventoryList.filter(
		(i) => i.location !== "mount_stash",
	);
	const totalCarriedWeight = carriedItems.reduce(
		(sum, item) => sum + (item.weightLbs || 0) * (item.quantity || 1),
		0,
	);

	const stashItems = inventoryList.filter((i) => i.location === "mount_stash");
	const totalStashWeight = stashItems.reduce(
		(sum, item) => sum + (item.weightLbs || 0) * (item.quantity || 1),
		0,
	);

	const getCapacityStatus = () => {
		if (totalCarriedWeight > maxCapacity) {
			return {
				label: "Acima do limite",
				tone: "border-rose-500/30 bg-rose-500/10 text-rose-300",
				barTone: "bg-rose-500",
				penalty: "Sem deslocamento normal",
			};
		}
		if (totalCarriedWeight > heavilyEncumberedThreshold) {
			return {
				label: "Sobrecarregado",
				tone: "border-amber-500/30 bg-amber-500/10 text-amber-300",
				barTone: "bg-amber-500",
				penalty: "-20 pés e desvantagem física",
			};
		}
		if (totalCarriedWeight > encumberedThreshold) {
			return {
				label: "Carga pesada",
				tone: "border-amber-500/25 bg-amber-500/10 text-amber-200",
				barTone: "bg-amber-400",
				penalty: "-10 pés de deslocamento",
			};
		}
		return {
			label: "Carga normal",
			tone: "border-border/70 bg-muted/60 text-muted-foreground",
			barTone: "bg-primary",
			penalty: `Normal até ${encumberedThreshold} lbs`,
		};
	};

	const capacityStatus = getCapacityStatus();
	const capacityPercentage = Math.min(
		100,
		Math.round((totalCarriedWeight / (maxCapacity || 1)) * 100),
	);

	const resetForm = () => {
		setName("");
		setQuantity(1);
		setWeightLbs(1);
		setLocation("backpack");
		setCategory("gear");
		setDescription("");
		setDamageDice("");
		setDamageType("slashing");
		setWeaponAbility("strength");
		setMagicBonus(0);
		setProficient(true);
		setExtraDamage([]);
		setEditingId(null);
	};

	const buildWeaponStats = (
		existing?: InventoryWeaponStats,
	): InventoryWeaponStats | undefined => {
		if (!showWeaponFields) return existing;
		if (!damageDiceTrimmed || damageDiceInvalid) return undefined;
		return {
			damageDice: damageDiceTrimmed,
			damageType,
			ability: weaponAbility,
			magicBonus: Math.trunc(Number(magicBonus) || 0),
			proficient,
			extraDamage: extraDamage
				.map((x) => ({ ...x, label: x.label.trim(), amount: x.amount.trim() }))
				.filter((x) => x.label || x.amount),
		};
	};

	const handleAddItem = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || (showWeaponFields && damageDiceInvalid)) return;

		const existing = editingId
			? inventoryList.find((i) => i.id === editingId)
			: undefined;
		const weapon = buildWeaponStats(existing?.weapon);
		const item: InventoryItem = {
			...existing,
			id: existing?.id ?? crypto.randomUUID(),
			name: name.trim(),
			quantity,
			weightLbs,
			location,
			category,
			description: description.trim(),
		};
		if (weapon) item.weapon = weapon;
		else delete item.weapon;

		onUpdateCharacter({
			inventoryList: existing
				? inventoryList.map((i) => (i.id === existing.id ? item : i))
				: [...inventoryList, item],
		});

		resetForm();
		setIsAdding(false);
	};

	const handleEditItem = (item: InventoryItem) => {
		setEditingId(item.id);
		setName(item.name);
		setQuantity(item.quantity || 1);
		setWeightLbs(item.weightLbs || 0);
		setLocation(item.location);
		setCategory(item.category ?? "gear");
		setDescription(item.description ?? "");
		setDamageDice(item.weapon?.damageDice ?? "");
		setDamageType(item.weapon?.damageType ?? "slashing");
		setWeaponAbility(normalizeWeaponAbility(item.weapon?.ability));
		setMagicBonus(item.weapon?.magicBonus ?? 0);
		setProficient(item.weapon?.proficient !== false);
		setExtraDamage(item.weapon?.extraDamage ?? []);
		setIsAdding(true);
	};

	const updateExtra = (
		id: string,
		patch: Partial<InventoryWeaponExtraDamage>,
	) => {
		setExtraDamage((rows) =>
			rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
		);
	};

	const handleRemoveItem = (id: string) => {
		onUpdateCharacter({
			inventoryList: inventoryList.filter((i) => i.id !== id),
		});
	};

	const handleUpdateQuantity = (id: string, delta: number) => {
		const entry = inventoryList.find((i) => i.id === id);
		if (!entry) return;
		if (isCatalogAmmoEntry(entry, campaignItems.byId)) {
			void updateAmmoQuantity(entry, delta);
			return;
		}
		onUpdateCharacter({
			inventoryList: inventoryList
				.map((i) =>
					i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i,
				)
				.filter((i) => i.quantity > 0),
		});
	};

	async function updateAmmoQuantity(entry: InventoryItem, delta: number) {
		if (qtyBusyId === entry.id) return;
		if (!restockAmmo) {
			toast.error({
				title: isAmmoRpcReady()
					? "Só o mestre pode reestocar munição."
					: "A quantidade de munição ainda não está disponível no servidor.",
			});
			return;
		}
		if (!campaignId) {
			toast.error({ title: "Nenhuma campanha ativa para alterar a munição." });
			return;
		}
		const next = nextAmmoQuantity(entry.quantity ?? 0, delta);
		if (next === (entry.quantity ?? 0)) return;
		setQtyBusyId(entry.id);
		try {
			const result = await setAmmoQuantity({
				campaignId,
				characterId: character.id,
				inventoryEntryId: entry.id,
				expected: entry.quantity ?? 0,
				next,
			});
			applyLocalInventoryQuantity(character.id, entry.id, result.quantity);
		} catch (error) {
			if (error instanceof AmmoConsumeOfflineError) {
				toast.error({ title: error.message });
			} else if (error instanceof AmmoConsumeUnavailableError) {
				toast.error({ title: error.message });
			} else if (error instanceof AmmoConsumeError && error.code === "40001") {
				toast.error({
					title:
						"A quantidade desta munição mudou. Recarregue e tente de novo.",
				});
			} else {
				toast.error({
					title:
						error instanceof Error
							? error.message
							: "Não foi possível alterar a munição.",
				});
			}
		} finally {
			setQtyBusyId(null);
		}
	}

	function ammoQuantityLock(entry: InventoryItem): {
		disabled: boolean;
		title?: string;
	} {
		if (!isCatalogAmmoEntry(entry, campaignItems.byId))
			return { disabled: false };
		if (qtyBusyId === entry.id)
			return { disabled: true, title: "Atualizando munição…" };
		if (!isAmmoRpcReady()) {
			return {
				disabled: true,
				title: "A quantidade de munição ainda não está disponível no servidor.",
			};
		}
		if (!restockAmmo) {
			return { disabled: true, title: "Só o mestre pode reestocar munição." };
		}
		return { disabled: false };
	}

	const handleSwitchLocation = (
		id: string,
		newLoc: "equipped" | "backpack" | "mount_stash",
	) => {
		onUpdateCharacter({
			inventoryList: inventoryList.map((i) =>
				i.id === id ? { ...i, location: newLoc } : i,
			),
		});
	};

	const filteredList = inventoryList.filter((item) => {
		if (activeTab === "all") return true;
		return item.location === activeTab;
	});

	const equippedCount = inventoryList.filter(
		(i) => i.location === "equipped",
	).length;
	const backpackCount = inventoryList.filter(
		(i) => i.location === "backpack",
	).length;
	const stashCount = inventoryList.filter(
		(i) => i.location === "mount_stash",
	).length;

	const isEncumbered = totalCarriedWeight > encumberedThreshold;

	return (
		<div className="space-y-4">
			{/* ── Encumbrance & Actions Header (Sem caixa aninhada) ── */}
			<div className="space-y-2">
				<div className="flex flex-wrap items-baseline justify-between gap-3">
					<div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
						<div className="flex items-baseline gap-1.5 tabular-nums">
							<span className="font-display text-lg font-bold text-foreground">
								{totalCarriedWeight.toFixed(1)}
							</span>
							<span className="text-xs text-muted-foreground">
								/ {maxCapacity} lbs
							</span>
						</div>

						<span className="text-xs text-muted-foreground tabular-nums">
							· FOR {strScore}
						</span>

						{totalStashWeight > 0 && (
							<span className="text-xs text-muted-foreground tabular-nums">
								· Montaria {totalStashWeight.toFixed(1)} lbs
							</span>
						)}

						{isEncumbered && (
							<span
								className={cn(
									"inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
									capacityStatus.tone,
								)}
							>
								{capacityStatus.label} · {capacityStatus.penalty}
							</span>
						)}
					</div>

					<div className="flex flex-wrap items-center gap-1.5">
						<PartyLootDialog />
						{canLink && (
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => setIsLinking(true)}
								className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
							>
								<Link2 className="h-3.5 w-3.5" />
								Da campanha
							</Button>
						)}
						<Button
							type="button"
							size="sm"
							variant={isAdding ? "ghost" : "default"}
							onClick={() => {
								if (isAdding) resetForm();
								setIsAdding(!isAdding);
							}}
							className="gap-1.5 text-xs"
						>
							<Plus className="h-3.5 w-3.5" />
							{isAdding ? "Cancelar" : "Novo Item"}
						</Button>
					</div>
				</div>

				{/* Slim Progress Track */}
				<div className="h-1 w-full overflow-hidden rounded-full bg-muted">
					<div
						className={cn(
							"h-full rounded-full transition-all duration-300",
							capacityStatus.barTone,
						)}
						style={{ width: `${capacityPercentage}%` }}
					/>
				</div>
			</div>

			{/* ── Formulário para Adicionar / Editar Item ── */}
			{isAdding && (
				<form
					onSubmit={handleAddItem}
					className="rounded-xl border border-primary/25 bg-background/60 p-4 space-y-3 animate-in fade-in duration-150"
				>
					<h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
						{editingId ? "Editar Item" : "Adicionar Novo Item ao Inventário"}
					</h3>

					<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
						<div className="sm:col-span-2">
							<Field>
								<FieldLabel>Nome do Item</FieldLabel>
								<Input
									placeholder="Ex: Espada Longa +1, Rações (5 dias), Poção de Cura..."
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
								/>
							</Field>
						</div>

						<div>
							<Field>
								<FieldLabel>Quantidade</FieldLabel>
								<Input
									type="number"
									min={1}
									value={quantity}
									onChange={(e) => setQuantity(Number(e.target.value))}
								/>
							</Field>
						</div>

						<div>
							<Field>
								<FieldLabel>Peso Unitário (lbs)</FieldLabel>
								<Input
									type="number"
									step="0.1"
									min={0}
									value={weightLbs}
									onChange={(e) => setWeightLbs(Number(e.target.value))}
								/>
							</Field>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<Field>
							<FieldLabel>Localização do Item</FieldLabel>
							<Select
								value={location}
								onChange={(e) =>
									setLocation(
										e.target.value as "equipped" | "backpack" | "mount_stash",
									)
								}
							>
								<option value="equipped">No Corpo / Equipado (Combate)</option>
								<option value="backpack">Mochila Pessoal (Nas Costas)</option>
								<option value="mount_stash">
									Mochila de Carga / Montaria (Não Pesa)
								</option>
							</Select>
						</Field>

						<Field>
							<FieldLabel>Categoria</FieldLabel>
							<Select
								value={category}
								onChange={(e) =>
									setCategory(e.target.value as InventoryCategory)
								}
							>
								<option value="gear">Equipamento / Geral</option>
								<option value="weapon">Arma</option>
								<option value="armor">Armadura / Escudo</option>
								<option value="potion">Poção / Consumível</option>
								<option value="treasure">Tesouro / Gema</option>
								<option value="custom">Outro</option>
							</Select>
						</Field>
					</div>

					<Field>
						<FieldLabel>Descrição / Propriedades</FieldLabel>
						<Textarea
							rows={2}
							placeholder="Efeitos, sintonização ou notas..."
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</Field>

					{showWeaponFields && (
						<fieldset className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-3">
							<legend className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
								Dano da arma (D&D 5e)
							</legend>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
								<Field>
									<FieldLabel>Dano base</FieldLabel>
									<Input
										placeholder="1d8"
										value={damageDice}
										onChange={(e) => setDamageDice(e.target.value)}
										aria-invalid={damageDiceInvalid || undefined}
									/>
								</Field>
								<Field>
									<FieldLabel>Tipo de dano</FieldLabel>
									<Select
										value={damageType}
										onChange={(e) =>
											setDamageType(e.target.value as DamageType)
										}
									>
										{DAMAGE_TYPES.map((t) => (
											<option key={t} value={t}>
												{DAMAGE_TYPE_LABELS[t]}
											</option>
										))}
									</Select>
								</Field>
								<Field>
									<FieldLabel>Atributo</FieldLabel>
									<Select
										aria-label="Atributo de ataque"
										value={weaponAbility}
										onChange={(e) =>
											setWeaponAbility(
												e.target.value as InventoryWeaponStats["ability"],
											)
										}
									>
										{WEAPON_ABILITIES.map((a) => (
											<option key={a} value={a}>
												{ABILITY_LABELS[a]}
											</option>
										))}
									</Select>
								</Field>
								<Field>
									<FieldLabel>Bônus mágico</FieldLabel>
									<Input
										type="number"
										step={1}
										value={magicBonus}
										onChange={(e) => setMagicBonus(Number(e.target.value))}
									/>
								</Field>
							</div>
							{damageDiceInvalid && (
								<p className="text-[11px] text-rose-400">
									Use um dado, ex.: 1d8 ou 2d6.
								</p>
							)}
							<label className="flex min-h-11 items-center gap-2 text-xs text-foreground select-none sm:min-h-0">
								<input
									type="checkbox"
									checked={proficient}
									onChange={(e) => setProficient(e.target.checked)}
									className="h-4 w-4 accent-primary"
								/>
								Proficiente com esta arma
							</label>

							<div className="space-y-2">
								<div className="flex items-center justify-between gap-2">
									<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
										Dano extra
									</span>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="gap-1 text-xs"
										onClick={() =>
											setExtraDamage((rows) => [
												...rows,
												{
													id: crypto.randomUUID(),
													label: "",
													amount: "",
													type: "fire",
												},
											])
										}
									>
										<Plus className="h-3.5 w-3.5" /> Adicionar
									</Button>
								</div>
								{extraDamage.map((row) => {
									const parsed = parseDamageFormula(row.amount);
									const isZero =
										!parsed || (parsed.dice.length === 0 && parsed.flat === 0);
									return (
										<div key={row.id} className="space-y-1">
											<div
												className={cn(
													"grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:grid-cols-[1fr_5rem_8rem_auto]",
													isZero && "opacity-60",
												)}
											>
												<Input
													className="col-span-3 sm:col-span-1"
													aria-label="Origem do dano extra"
													placeholder="Runa da tempestade"
													value={row.label}
													onChange={(e) =>
														updateExtra(row.id, { label: e.target.value })
													}
												/>
												<Input
													aria-label="Valor do dano extra"
													placeholder="+2 ou 1d6"
													value={row.amount}
													onChange={(e) =>
														updateExtra(row.id, { amount: e.target.value })
													}
												/>
												<Select
													aria-label="Tipo do dano extra"
													value={row.type}
													onChange={(e) =>
														updateExtra(row.id, {
															type: e.target.value as DamageType,
														})
													}
												>
													{DAMAGE_TYPES.map((t) => (
														<option key={t} value={t}>
															{DAMAGE_TYPE_LABELS[t]}
														</option>
													))}
												</Select>
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													aria-label="Remover dano extra"
													onClick={() =>
														setExtraDamage((rows) =>
															rows.filter((r) => r.id !== row.id),
														)
													}
													className="text-muted-foreground hover:text-rose-300"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
											{isZero && row.amount.trim() !== "" && (
												<p className="text-[11px] text-muted-foreground">
													Valor 0 ou inválido: não entra no dano.
												</p>
											)}
										</div>
									);
								})}
							</div>
						</fieldset>
					)}

					<div className="flex justify-end gap-2 pt-1">
						{editingId && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => {
									resetForm();
									setIsAdding(false);
								}}
							>
								Cancelar
							</Button>
						)}
						<Button
							type="submit"
							size="sm"
							disabled={showWeaponFields && damageDiceInvalid}
						>
							{editingId ? "Salvar alterações" : "Salvar no Inventário"}
						</Button>
					</div>
				</form>
			)}

			{/* ── Navegação por Abas das Mochilas (só quando há itens) ── */}
			{inventoryList.length > 0 && (
				<div className="flex flex-wrap items-center gap-2 sm:gap-1">
					<FilterPill
						active={activeTab === "all"}
						onClick={() => setActiveTab("all")}
						count={inventoryList.length}
					>
						Todos
					</FilterPill>

					<FilterPill
						active={activeTab === "equipped"}
						onClick={() => setActiveTab("equipped")}
						count={equippedCount}
						Icon={Sword}
					>
						No Corpo
					</FilterPill>

					<FilterPill
						active={activeTab === "backpack"}
						onClick={() => setActiveTab("backpack")}
						count={backpackCount}
						Icon={Backpack}
					>
						Mochila Pessoal
					</FilterPill>

					<FilterPill
						active={activeTab === "mount_stash"}
						onClick={() => setActiveTab("mount_stash")}
						count={stashCount}
						Icon={Warehouse}
					>
						Montaria / Carga
					</FilterPill>
				</div>
			)}

			{/* ── Lista de Itens do Inventário ── */}
			{filteredList.length === 0 ? (
				!isAdding && (
					<p className="text-xs text-muted-foreground">
						{inventoryList.length === 0
							? "Nenhum item no inventário."
							: "Nenhum item neste compartimento."}
					</p>
				)
			) : (
				<ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-background/40">
					{filteredList.map((item) => {
						if (item.campaignItemId) {
							return (
								<li key={item.id} className="p-3">
									<LinkedInventoryRow
										entry={item}
										item={campaignItems.byId.get(item.campaignItemId) ?? null}
										character={character}
										canEditLink={canLink}
										effective={effectiveStats}
										onChange={(patch) => patchEntry(item.id, patch)}
										onQuantity={(delta) => handleUpdateQuantity(item.id, delta)}
										onUnlink={() => handleRemoveItem(item.id)}
										quantityDisabled={ammoQuantityLock(item).disabled}
										quantityTitle={ammoQuantityLock(item).title}
									/>
								</li>
							);
						}
						const itemTotalWeight =
							(item.weightLbs || 0) * (item.quantity || 1);

						return (
							<li
								key={item.id}
								className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-background/60"
							>
								<div className="space-y-0.5 flex-1 min-w-0">
									<div className="flex flex-wrap items-center gap-2">
										<span className="font-medium text-sm text-foreground">
											{item.name}
										</span>
										{item.location === "equipped" && (
											<span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
												<Sword className="h-3 w-3" />
												No Corpo
											</span>
										)}
										{isDnd5e && item.category === "weapon" && item.weapon && (
											<span className="font-mono text-[11px] text-muted-foreground tabular-nums">
												{item.weapon.damageDice}{" "}
												{DAMAGE_TYPE_LABELS[item.weapon.damageType]}
											</span>
										)}
										{item.location === "mount_stash" && (
											<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
												<Warehouse className="h-3 w-3" />
												Montaria
											</span>
										)}
									</div>

									{item.description && (
										<p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
											{item.description}
										</p>
									)}
								</div>

								<div className="flex flex-wrap items-center gap-2 shrink-0">
									<span className="text-xs font-mono tabular-nums text-muted-foreground">
										{itemTotalWeight.toFixed(1)} lbs
									</span>

									{/* Alterar Quantidade */}
									<div className="flex items-center gap-0.5 border border-border/50 rounded-lg p-0.5 bg-background">
										<Button
											type="button"
											variant="ghost"
											size="xs"
											className="h-6 w-6 p-0"
											onClick={() => handleUpdateQuantity(item.id, -1)}
										>
											-
										</Button>
										<span className="text-xs font-mono font-semibold px-1.5 tabular-nums">
											{item.quantity}
										</span>
										<Button
											type="button"
											variant="ghost"
											size="xs"
											className="h-6 w-6 p-0"
											onClick={() => handleUpdateQuantity(item.id, 1)}
										>
											+
										</Button>
									</div>

									{/* Mover entre Mochilas */}
									<LocationToggle
										label={`Onde fica ${item.name}`}
										value={item.location}
										onChange={(next) => handleSwitchLocation(item.id, next)}
									/>

									{/* Editar Item */}
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										aria-label={`Editar ${item.name}`}
										onClick={() => handleEditItem(item)}
										className="text-muted-foreground hover:text-foreground"
									>
										<Pencil className="h-3.5 w-3.5" />
									</Button>

									{/* Excluir Item */}
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										onClick={() => handleRemoveItem(item.id)}
										className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							</li>
						);
					})}
				</ul>
			)}

			{canLink && (
				<LinkCampaignItemDialog
					open={isLinking}
					onOpenChange={setIsLinking}
					character={character}
					items={campaignItems.items}
					current={linkedEntries}
					onLink={(entry) =>
						onUpdateCharacter({ inventoryList: [...inventoryList, entry] })
					}
				/>
			)}

			{/* Anotações Legado (Equipamento & Moedas) */}
			{(character.equipment?.trim() || character.currency?.trim()) && (
				<div className="space-y-2 border-t border-border/40 pt-3">
					<h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1.5">
						<Coins className="h-3.5 w-3.5 text-primary" />
						Moedas & Anotações de Equipamento
					</h3>
					<div className="grid gap-2 sm:grid-cols-2">
						{character.currency?.trim() && (
							<div className="text-xs text-foreground bg-background/40 p-3 rounded-xl border border-border/60">
								<span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
									Moedas / Tesouros
								</span>
								{character.currency}
							</div>
						)}
						{character.equipment?.trim() && (
							<div className="text-xs text-foreground/90 whitespace-pre-wrap bg-background/40 p-3 rounded-xl border border-border/60">
								<span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
									Anotações
								</span>
								{character.equipment}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function FilterPill({
	active,
	onClick,
	count,
	Icon,
	children,
}: {
	active: boolean;
	onClick: () => void;
	count: number;
	Icon?: React.ComponentType<{ className?: string }>;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex min-h-[44px] sm:min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 select-none cursor-pointer",
				active
					? "border-primary/35 bg-primary/15 text-primary"
					: "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
			)}
		>
			{Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
			<span>{children}</span>
			<span
				className={cn(
					"font-mono text-[11px] tabular-nums",
					active ? "text-primary" : "text-muted-foreground",
				)}
			>
				({count})
			</span>
		</button>
	);
}
