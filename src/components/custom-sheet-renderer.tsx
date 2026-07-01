import type { UseFormRegister, Path } from "react-hook-form";
import { useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import type { CharacterFormValues } from "./character-sheet-fields";
import { Field } from "./ui/form-tabs";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

interface CustomSheetRendererProps {
	templateId: string;
	register: UseFormRegister<CharacterFormValues>;
	viewMode?: boolean;
	character?: Character;
}

export function CustomSheetRenderer({
	templateId,
	register,
	viewMode,
	character,
}: CustomSheetRendererProps) {
	const customTemplates = useRPGStore((state) => state.customTemplates || []);
	const template = customTemplates.find((t) => t.id === templateId);

	if (!template) {
		return (
			<p className="text-muted-foreground text-sm">Template não encontrado.</p>
		);
	}

	if (!template.sections?.length) {
		return (
			<p className="text-muted-foreground text-sm">
				Este layout usa blocos modulares — edite o conteúdo diretamente na
				ficha.
			</p>
		);
	}

	return (
		<div className="space-y-10">
			{template.sections.map((section) => (
				<section key={section.id}>
					<h3 className="mb-4 text-xl font-bold font-display text-foreground border-b border-border/60 pb-2">
						{section.title}
					</h3>
					<div className="flex flex-wrap gap-4">
						{section.fields.map((field) => {
							let widthClass = "w-full";
							if (field.width === "half") widthClass = "w-[calc(50%-8px)]";
							if (field.width === "third")
								widthClass = "w-[calc(33.333%-11px)]";
							if (field.width === "quarter") widthClass = "w-[calc(25%-12px)]";

							return (
								<div key={field.id} className={widthClass}>
									<Field label={field.label}>
										{field.type === "textarea" ? (
											viewMode ? (
												<p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
													{character?.systemFields?.[field.id] ||
														"Nada registrado."}
												</p>
											) : (
												<Textarea
													{...register(`systemFields.${field.id}` as Path<CharacterFormValues>)}
													placeholder={field.placeholder}
												/>
											)
										) : field.type === "number" ? (
											viewMode ? (
												<p className="text-lg font-bold">
													{character?.systemAttributes?.[field.id] || 0}
												</p>
											) : (
												<Input
													type="number"
													{...register(`systemAttributes.${field.id}` as Path<CharacterFormValues>)}
													placeholder={field.placeholder}
												/>
											)
										) : field.type === "checkbox" ? (
											viewMode ? (
												<p className="text-sm font-bold">
													{character?.systemFields?.[field.id] ? "Sim" : "Não"}
												</p>
											) : (
												<div className="flex items-center gap-2 h-10 px-3 border border-input rounded-md bg-background">
													<input
														type="checkbox"
														{...register(`systemFields.${field.id}` as Path<CharacterFormValues>)}
														className="w-4 h-4 text-primary bg-background border-input rounded"
													/>
													<span className="text-sm text-muted-foreground">
														{field.label}
													</span>
												</div>
											)
										) : field.type === "attribute_box" ? (
											viewMode ? (
												<div className="text-center bg-muted/20 border border-border/70 rounded-xl p-3">
													<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
														{field.label}
													</p>
													<p className="mt-2 text-center text-3xl font-bold font-display h-12 bg-transparent">
														{character?.systemAttributes?.[field.id] ?? 0}
													</p>
												</div>
											) : (
												<div className="text-center bg-muted/20 border border-border/70 rounded-xl p-3">
													<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
														{field.label}
													</p>
													<Input
														type="number"
														className="mt-2 text-center text-3xl font-bold font-display h-12 bg-transparent border-transparent focus-visible:ring-1 focus-visible:border-primary"
														{...register(`systemAttributes.${field.id}` as Path<CharacterFormValues>)}
														placeholder={field.placeholder || "0"}
													/>
												</div>
											)
										) : viewMode ? (
											<p className="text-sm">
												{character?.systemFields?.[field.id] || "-"}
											</p>
										) : (
											<Input
												type="text"
												{...register(`systemFields.${field.id}` as Path<CharacterFormValues>)}
												placeholder={field.placeholder}
											/>
										)}
									</Field>
								</div>
							);
						})}
						{section.fields.length === 0 && (
							<p className="text-sm text-muted-foreground">
								Nenhum campo nesta seção.
							</p>
						)}
					</div>
				</section>
			))}
		</div>
	);
}
