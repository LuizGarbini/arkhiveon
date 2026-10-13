/**
 * Controle de tamanho da fonte dos campos de texto do PDF (por pessoa).
 * "Todos os campos" + "Um campo" (busca entre os campos de texto; o último
 * campo editado no PDF já vem selecionado). Só componentes do DS.
 */
import { Check, Search, Type } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import {
	FONT_SIZE_AUTO,
	FONT_SIZE_OPTIONS,
	type FontSizes,
	hasFontSizes,
	type TextFieldInfo,
} from "@/lib/library/pdf-font-sizes";
import { cn } from "@/lib/utils";

const ORIGINAL = "original";

function sizeLabel(size: number): string {
	return size === FONT_SIZE_AUTO ? "Automático" : `${size} pt`;
}

function SizeSelect({
	value,
	originalLabel,
	onChange,
	disabled,
	ariaLabel,
}: {
	value: number | undefined;
	originalLabel: string;
	onChange: (size: number | undefined) => void;
	disabled?: boolean;
	ariaLabel: string;
}) {
	return (
		<Select
			aria-label={ariaLabel}
			value={value === undefined ? ORIGINAL : String(value)}
			disabled={disabled}
			onChange={(event) => {
				const next = event.target.value;
				onChange(next === ORIGINAL ? undefined : Number(next));
			}}
			className="h-11 md:h-10"
		>
			<option value={ORIGINAL}>{originalLabel}</option>
			{FONT_SIZE_OPTIONS.map((size) => (
				<option key={size} value={String(size)}>
					{sizeLabel(size)}
				</option>
			))}
		</Select>
	);
}

export function FontSizeControl({
	fields,
	sizes,
	selectedField,
	onSelectField,
	onChange,
	busy,
}: {
	fields: TextFieldInfo[];
	sizes: FontSizes;
	selectedField: string | null;
	onSelectField: (name: string) => void;
	onChange: (next: FontSizes) => void;
	busy: boolean;
}) {
	const [query, setQuery] = useState("");
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		const list = q
			? fields.filter((field) => field.name.toLowerCase().includes(q))
			: fields;
		return list.slice(0, 200);
	}, [fields, query]);
	const selected = fields.find((field) => field.name === selectedField);

	function setAll(size: number | undefined) {
		onChange({ ...sizes, all: size, fields: sizes.fields });
	}
	function setField(name: string, size: number | undefined) {
		const next = { ...sizes.fields };
		if (size === undefined) delete next[name];
		else next[name] = size;
		onChange({ ...sizes, fields: next });
	}

	const disabled = busy || fields.length === 0;

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						className={cn(
							"min-h-11 shrink-0 active:scale-[0.98]",
							hasFontSizes(sizes) && "border-primary/50 text-primary",
						)}
						aria-label="Tamanho da fonte dos campos"
					/>
				}
			>
				<Type className="h-4 w-4 sm:mr-2" />
				<span className="hidden sm:inline">Fonte</span>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-[min(22rem,calc(100vw-1.5rem))] gap-4"
			>
				<PopoverHeader>
					<PopoverTitle>Tamanho da fonte</PopoverTitle>
					<PopoverDescription className="text-[12px]">
						Vale só pra você e vai junto no PDF exportado. O arquivo original
						não muda.
					</PopoverDescription>
				</PopoverHeader>

				{fields.length === 0 ? (
					<p className="text-[12px] text-muted-foreground">
						Este PDF não tem campos de texto preenchíveis.
					</p>
				) : (
					<>
						<section className="flex flex-col gap-1.5">
							<span className="text-[12px] font-medium text-foreground">
								Todos os campos
							</span>
							<SizeSelect
								ariaLabel="Tamanho de todos os campos"
								value={sizes.all}
								originalLabel="Como no PDF"
								onChange={setAll}
								disabled={disabled}
							/>
						</section>

						<section className="flex flex-col gap-1.5">
							<span className="text-[12px] font-medium text-foreground">
								Um campo
							</span>
							<div className="relative">
								<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									placeholder="Buscar campo"
									aria-label="Buscar campo"
									className="h-11 pl-9 md:h-10"
								/>
							</div>
							<div
								role="listbox"
								aria-label="Campos de texto"
								className="max-h-40 overflow-y-auto rounded-lg border border-border/70 bg-background/40 p-1"
							>
								{filtered.length === 0 ? (
									<p className="px-2 py-2 text-[12px] text-muted-foreground">
										Nenhum campo com esse nome.
									</p>
								) : (
									filtered.map((field) => {
										const active = field.name === selectedField;
										const custom = sizes.fields[field.name];
										return (
											<button
												key={field.name}
												type="button"
												role="option"
												aria-selected={active}
												onClick={() => onSelectField(field.name)}
												className={cn(
													"flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors",
													active
														? "bg-primary/15 text-foreground"
														: "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
												)}
											>
												<Check
													className={cn(
														"h-3.5 w-3.5 shrink-0 text-primary",
														active ? "opacity-100" : "opacity-0",
													)}
												/>
												<span className="min-w-0 flex-1 truncate">
													{field.name}
												</span>
												{custom !== undefined && (
													<span className="shrink-0 text-[11px] text-primary tabular-nums">
														{sizeLabel(custom)}
													</span>
												)}
											</button>
										);
									})
								)}
							</div>
							<SizeSelect
								ariaLabel="Tamanho do campo escolhido"
								value={selected ? sizes.fields[selected.name] : undefined}
								originalLabel={
									selected ? "Igual aos outros" : "Escolha um campo acima"
								}
								onChange={(size) => selected && setField(selected.name, size)}
								disabled={disabled || !selected}
							/>
							<p className="text-[11px] text-muted-foreground">
								Dica: digite num campo da ficha e ele aparece selecionado aqui.
							</p>
						</section>

						{hasFontSizes(sizes) && (
							<Button
								variant="ghost"
								disabled={disabled}
								onClick={() => onChange({ fields: {} })}
								className="min-h-11 self-start px-2 text-[12px]"
							>
								Voltar tudo ao tamanho do PDF
							</Button>
						)}
					</>
				)}
			</PopoverContent>
		</Popover>
	);
}
