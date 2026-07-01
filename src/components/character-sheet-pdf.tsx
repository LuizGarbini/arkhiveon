import {
	Document,
	Image,
	Page,
	pdf,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";
import { normalizeSheetLayout, SHEET_MODULE_LABELS } from "@/lib/sheet-modules";
import type {
	Character,
	SheetModuleConfig,
	SheetModuleKind,
} from "@/lib/store";
import { systemLabel } from "@/lib/store";
import { SYSTEM_CONFIG } from "@/lib/systems";

export type CharacterSheetPdfVariant = "color" | "blackAndWhite";

export interface CharacterSheetPdfOptions {
	variant?: CharacterSheetPdfVariant;
	includeImage?: boolean;
	includeAppLogo?: boolean;
}

const styles = StyleSheet.create({
	page: {
		padding: 32,
		fontFamily: "Helvetica",
		fontSize: 9,
	},
	header: {
		padding: 18,
		borderRadius: 16,
		border: "1 solid #3a3048",
		marginBottom: 16,
	},
	brandRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 18,
	},
	brand: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	brandMark: {
		width: 32,
		height: 32,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center",
		fontSize: 11,
		fontWeight: 700,
	},
	brandName: {
		fontSize: 10,
		textTransform: "uppercase",
		letterSpacing: 1.8,
		fontWeight: 700,
	},
	exportMeta: {
		fontSize: 8,
	},
	headerBody: {
		flexDirection: "row",
		gap: 16,
		alignItems: "stretch",
	},
	portrait: {
		width: 96,
		minHeight: 116,
		borderRadius: 14,
		border: "1 solid #3a3048",
		overflow: "hidden",
		alignItems: "center",
		justifyContent: "center",
	},
	portraitImage: {
		width: 96,
		height: 116,
		objectFit: "cover",
	},
	portraitFallback: {
		fontSize: 20,
		fontWeight: 700,
	},
	headerInfo: {
		flexGrow: 1,
		flexShrink: 1,
	},
	title: {
		fontSize: 26,
		fontWeight: 700,
		marginBottom: 6,
	},
	subtitle: {
		fontSize: 10,
	},
	statsGrid: {
		flexDirection: "row",
		gap: 8,
		marginTop: 16,
	},
	stat: {
		flexGrow: 1,
		padding: 10,
		borderRadius: 12,
		border: "1 solid #3a3048",
	},
	statLabel: {
		fontSize: 7,
		textTransform: "uppercase",
		letterSpacing: 1.2,
		marginBottom: 4,
	},
	statValue: {
		fontSize: 13,
		fontWeight: 700,
	},
	module: {
		padding: 14,
		borderRadius: 14,
		border: "1 solid #3a3048",
		marginBottom: 10,
	},
	moduleTitle: {
		fontSize: 11,
		textTransform: "uppercase",
		letterSpacing: 1.4,
		fontWeight: 700,
		marginBottom: 10,
	},
	fieldGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	field: {
		width: "48%",
		padding: 8,
		borderRadius: 10,
		border: "1 solid #30273d",
	},
	fieldFull: {
		width: "100%",
		padding: 8,
		borderRadius: 10,
		border: "1 solid #30273d",
	},
	fieldLabel: {
		fontSize: 7,
		textTransform: "uppercase",
		letterSpacing: 1,
		marginBottom: 4,
	},
	fieldValue: {
		fontSize: 9,
		lineHeight: 1.35,
	},
	abilityValue: {
		fontSize: 14,
		fontWeight: 700,
	},
	footer: {
		marginTop: 8,
		fontSize: 8,
		textAlign: "center",
	},
});

const colorTheme = StyleSheet.create({
	page: { backgroundColor: "#17131f", color: "#f4f0ea" },
	header: { backgroundColor: "#211a2c", borderColor: "#3a3048" },
	brandMark: { backgroundColor: "#d6b36a", color: "#17131f" },
	brandName: { color: "#d6b36a" },
	muted: { color: "#a79bb8" },
	subtitle: { color: "#c5b8d6" },
	portrait: { backgroundColor: "#17131f", borderColor: "#3a3048" },
	portraitFallback: { color: "#d6b36a" },
	stat: { backgroundColor: "#17131f", borderColor: "#3a3048" },
	module: { backgroundColor: "#211a2c", borderColor: "#3a3048" },
	moduleTitle: { color: "#d6b36a" },
	field: { backgroundColor: "#17131f", borderColor: "#30273d" },
	fieldValue: { color: "#f4f0ea" },
	footer: { color: "#8f82a1" },
});

const blackAndWhiteTheme = StyleSheet.create({
	page: { backgroundColor: "#ffffff", color: "#111111" },
	header: { backgroundColor: "#ffffff", borderColor: "#111111" },
	brandMark: { backgroundColor: "#111111", color: "#ffffff" },
	brandName: { color: "#111111" },
	muted: { color: "#555555" },
	subtitle: { color: "#333333" },
	portrait: { backgroundColor: "#f5f5f5", borderColor: "#111111" },
	portraitFallback: { color: "#111111" },
	stat: { backgroundColor: "#f7f7f7", borderColor: "#333333" },
	module: { backgroundColor: "#ffffff", borderColor: "#111111" },
	moduleTitle: { color: "#111111" },
	field: { backgroundColor: "#f7f7f7", borderColor: "#777777" },
	fieldValue: { color: "#111111" },
	footer: { color: "#555555" },
});

export async function downloadCharacterSheetPdf(
	character: Character,
	options: CharacterSheetPdfOptions = {},
) {
	const normalizedOptions = {
		variant: options.variant ?? "color",
		includeImage: options.includeImage ?? false,
		includeAppLogo: options.includeAppLogo ?? true,
	} satisfies Required<CharacterSheetPdfOptions>;
	const blob = await pdf(
		<CharacterSheetPdfDocument
			character={character}
			options={normalizedOptions}
		/>,
	).toBlob();
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	const suffix =
		normalizedOptions.variant === "blackAndWhite" ? "-preto-e-branco" : "";
	anchor.download = `${safeFileName(character.characterName || "ficha")}${suffix}.pdf`;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

function CharacterSheetPdfDocument({
	character,
	options,
}: {
	character: Character;
	options: Required<CharacterSheetPdfOptions>;
}) {
	const config = SYSTEM_CONFIG[character.system] ?? SYSTEM_CONFIG.generic;
	const modules = normalizeSheetLayout(character)
		.modules.filter((module) => module.enabled)
		.sort((a, b) => a.order - b.order);
	const theme =
		options.variant === "blackAndWhite" ? blackAndWhiteTheme : colorTheme;
	const appName = "Arkhiveon";

	return (
		<Document title={`${character.characterName || "Ficha"} | ${appName}`}>
			<Page size="A4" style={[styles.page, theme.page]}>
				<View style={[styles.header, theme.header]} wrap={false}>
					<View style={styles.brandRow}>
						{options.includeAppLogo ? (
							<View style={styles.brand}>
								<View style={[styles.brandMark, theme.brandMark]}>
									<Text>RN</Text>
								</View>
								<View>
									<Text style={[styles.brandName, theme.brandName]}>
										{appName}
									</Text>
									<Text style={[styles.exportMeta, theme.muted]}>
										Ficha exportada
									</Text>
								</View>
							</View>
						) : (
							<Text style={[styles.exportMeta, theme.muted]}>
								Ficha exportada
							</Text>
						)}
						<Text style={[styles.exportMeta, theme.muted]}>
							{new Date().toLocaleDateString("pt-BR")}
						</Text>
					</View>

					<View style={styles.headerBody}>
						{options.includeImage && (
							<View style={[styles.portrait, theme.portrait]}>
								{character.imageUrl ? (
									<Image
										src={character.imageUrl}
										style={styles.portraitImage}
									/>
								) : (
									<Text
										style={[styles.portraitFallback, theme.portraitFallback]}
									>
										{initials(character.characterName)}
									</Text>
								)}
							</View>
						)}

						<View style={styles.headerInfo}>
							<Text style={styles.title}>
								{character.characterName || "Ficha sem nome"}
							</Text>
							<Text style={[styles.subtitle, theme.subtitle]}>
								{systemLabel(character.system)} -{" "}
								{[character.race, character.class, character.subclass]
									.filter(Boolean)
									.join(" - ") || config.tagline}
							</Text>
							<View style={styles.statsGrid}>
								<QuickPdfStat
									label="PV"
									value={`${character.health}/${character.healthMax}`}
									theme={theme}
								/>
								<QuickPdfStat
									label="CA"
									value={String(character.armorClass)}
									theme={theme}
								/>
								<QuickPdfStat
									label="Iniciativa"
									value={formatSigned(character.initiative)}
									theme={theme}
								/>
								<QuickPdfStat
									label="Movimento"
									value={`${character.speed}${config.speedUnit}`}
									theme={theme}
								/>
							</View>
						</View>
					</View>
				</View>

				{modules.map((module) => (
					<PdfModule
						key={module.id}
						module={module}
						character={character}
						config={config}
						theme={theme}
					/>
				))}

				<Text style={[styles.footer, theme.footer]}>
					{options.includeAppLogo
						? `Gerado pelo ${appName} - organize fichas, lore e campanha em um so lugar`
						: "Ficha exportada"}
				</Text>
			</Page>
		</Document>
	);
}

function QuickPdfStat({
	label,
	value,
	theme,
}: {
	label: string;
	value: string;
	theme: typeof colorTheme;
}) {
	return (
		<View style={[styles.stat, theme.stat]}>
			<Text style={[styles.statLabel, theme.muted]}>{label}</Text>
			<Text style={[styles.statValue, theme.fieldValue]}>{value}</Text>
		</View>
	);
}

function PdfModule({
	module,
	character,
	config,
	theme,
}: {
	module: SheetModuleConfig;
	character: Character;
	config: (typeof SYSTEM_CONFIG)[keyof typeof SYSTEM_CONFIG];
	theme: typeof colorTheme;
}) {
	const title = module.title || SHEET_MODULE_LABELS[module.kind];
	const fields = moduleFields(module.kind, character, config, module.content);
	if (fields.length === 0) return null;

	return (
		<View style={[styles.module, theme.module]} wrap={false}>
			<Text style={[styles.moduleTitle, theme.moduleTitle]}>{title}</Text>
			<View style={styles.fieldGrid}>
				{fields.map((field) => (
					<View
						key={field.label}
						style={[field.full ? styles.fieldFull : styles.field, theme.field]}
						wrap={false}
					>
						<Text style={[styles.fieldLabel, theme.muted]}>{field.label}</Text>
						<Text
							style={[
								field.emphasis ? styles.abilityValue : styles.fieldValue,
								theme.fieldValue,
							]}
						>
							{field.value || "-"}
						</Text>
					</View>
				))}
			</View>
		</View>
	);
}

function moduleFields(
	kind: SheetModuleKind,
	character: Character,
	config: (typeof SYSTEM_CONFIG)[keyof typeof SYSTEM_CONFIG],
	content?: string,
) {
	const isStandardKey = (key: string) =>
		[
			"strength",
			"dexterity",
			"constitution",
			"intelligence",
			"wisdom",
			"charisma",
			"power",
			"size",
			"education",
		].includes(key);

	switch (kind) {
		case "identity":
			return [
				field("Nome", character.characterName),
				field("Jogador", character.playerName),
				field("Raca", character.race),
				field("Classe", character.class),
				field("Subclasse", character.subclass),
				field("Antecedente", character.background),
				field("Tendencia", character.alignment),
				field("Nivel", String(character.level)),
			];
		case "abilities":
			return (config.attributes || []).map((attr) => {
				const val = isStandardKey(attr.key)
					? Number((character as any)[attr.key]) || 0
					: Number(character.systemAttributes?.[attr.key]) || 0;
				return field(attr.label, `${val} (${formatSigned(modifier(val))})`, {
					emphasis: true,
				});
			});
		case "combat":
			return [
				field("Pontos de Vida", `${character.health}/${character.healthMax}`),
				field("PV Temporarios", String(character.tempHealth)),
				field("Classe de Armadura", String(character.armorClass)),
				field("Iniciativa", formatSigned(character.initiative)),
				field("Movimento", String(character.speed)),
				field("Dados de Vida", character.hitDice),
				field("Proficiencia", formatSigned(character.proficiencyBonus)),
				field("Salvaguardas", character.savingThrows, { full: true }),
			];
		case "sanity":
			return [
				field("Sanidade", `${character.sanity}/${character.sanityMax}`),
				field("Poder", String(character.power)),
				field("Tamanho", String(character.size)),
				field("Educacao", String(character.education)),
			];
		case "magic":
			return [
				field("Classe conjuradora", character.spellcastingClass),
				field("Habilidade", character.spellAbility),
				field("CD", String(character.spellSaveDc)),
				field("Ataque magico", formatSigned(character.spellAttackBonus)),
				field("Magias", character.spells, { full: true }),
				field("Espacos", character.spellSlots, { full: true }),
			];
		case "inventory":
			return [
				field("Equipamento", character.equipment, { full: true }),
				field("Moedas", character.currency, { full: true }),
			];
		case "personality":
			return [
				field("Tracos", character.personalityTraits, { full: true }),
				field("Ideais", character.ideals, { full: true }),
				field("Vinculos", character.bonds, { full: true }),
				field("Defeitos", character.flaws, { full: true }),
			];
		case "notes":
			return [field("Notas", character.notes, { full: true })];
		case "customText":
		case "customStats":
			return [field("Conteudo", content ?? "", { full: true })];
		default:
			return [];
	}
}

function field(
	label: string,
	value: string,
	options: { full?: boolean; emphasis?: boolean } = {},
) {
	return { label, value, ...options };
}

function modifier(score: number) {
	return Math.floor((score - 10) / 2);
}

function formatSigned(value: number) {
	return value >= 0 ? `+${value}` : String(value);
}

function initials(value: string) {
	const letters = value
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
	return letters || "RN";
}

function safeFileName(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-zA-Z0-9-_]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.toLowerCase();
}
