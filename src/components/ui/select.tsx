import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Select do design system — shadcn sobre Base UI (mesma base do
 * `dropdown-menu` e do `dialog`). Nada de `<select>` nativo: o popup é
 * nosso, com os tokens do DS, e respeita o tema em qualquer SO.
 *
 * Dois jeitos de usar:
 * - `Select` (compatível): mesma API do `<select>` antigo — `<option>` como
 *   filhos, `value`/`defaultValue`, `onChange(e)` com `e.target.value` e
 *   `{...register("campo")}` do react-hook-form. Os formulários existentes
 *   não mudam uma linha.
 * - Primitivos (`SelectRoot`, `SelectTrigger`, `SelectValue`,
 *   `SelectContent`, `SelectItem`…) para código novo.
 */

const SelectRoot = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;

const triggerClassName =
	"flex h-10 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-left text-[16px] text-foreground shadow-xs outline-none transition-colors select-none md:text-sm dark:bg-input/10 focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-primary/15 data-popup-open:border-primary/50 data-disabled:cursor-not-allowed data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

function SelectTrigger({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			className={cn(triggerClassName, className)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon className="flex text-muted-foreground">
				<ChevronDownIcon className="size-4" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
	return (
		<SelectPrimitive.Value
			data-slot="select-value"
			className={cn(
				"min-w-0 flex-1 truncate data-placeholder:text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function SelectContent({
	className,
	children,
	side = "bottom",
	sideOffset = 4,
	align = "start",
	alignItemWithTrigger = false,
	...props
}: SelectPrimitive.Popup.Props &
	Pick<
		SelectPrimitive.Positioner.Props,
		"side" | "sideOffset" | "align" | "alignItemWithTrigger"
	>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Positioner
				className="isolate z-50 outline-none"
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignItemWithTrigger={alignItemWithTrigger}
			>
				<SelectPrimitive.Popup
					data-slot="select-content"
					className={cn(
						"t-dropdown max-h-(--available-height) w-(--anchor-width) min-w-32 overflow-x-hidden overflow-y-auto rounded-xl border border-border/70 bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/15 ring-1 ring-foreground/10 outline-none md:bg-popover/95 md:backdrop-blur-xl",
						className,
					)}
					{...props}
				>
					{children}
				</SelectPrimitive.Popup>
			</SelectPrimitive.Positioner>
		</SelectPrimitive.Portal>
	);
}

function SelectItem({
	className,
	children,
	...props
}: SelectPrimitive.Item.Props) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				"relative flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-lg py-2 pr-8 pl-2.5 text-[15px] outline-hidden select-none transition-colors duration-100 md:min-h-9 md:text-sm data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:text-primary data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			{...props}
		>
			<SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">
				{children}
			</SelectPrimitive.ItemText>
			<SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
				<CheckIcon className="size-4" />
			</SelectPrimitive.ItemIndicator>
		</SelectPrimitive.Item>
	);
}

function SelectGroupLabel({
	className,
	...props
}: SelectPrimitive.GroupLabel.Props) {
	return (
		<SelectPrimitive.GroupLabel
			data-slot="select-group-label"
			className={cn(
				"px-2.5 py-1.5 text-xs font-medium text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function SelectSeparator({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
	return (
		<SelectPrimitive.Separator
			data-slot="select-separator"
			className={cn("-mx-1.5 my-1 h-px bg-border/70", className)}
			{...props}
		/>
	);
}

/* ------------------------------------------------------------------ */
/* Select compatível com a API do <select> antigo                      */
/* ------------------------------------------------------------------ */

type NativeOption = {
	value: string;
	label: React.ReactNode;
	text: string;
	disabled?: boolean;
	hidden?: boolean;
	group?: string;
};

function textOf(node: React.ReactNode): string {
	if (node === null || node === undefined || typeof node === "boolean")
		return "";
	if (typeof node === "string" || typeof node === "number") return String(node);
	if (Array.isArray(node)) return node.map(textOf).join("");
	if (React.isValidElement<{ children?: React.ReactNode }>(node))
		return textOf(node.props.children);
	return "";
}

/** Lê `<option>` (e `<optgroup>`/fragments) dos filhos, como o `<select>` faria. */
export function collectSelectOptions(
	children: React.ReactNode,
	out: NativeOption[] = [],
	group?: string,
): NativeOption[] {
	React.Children.forEach(children, (child) => {
		if (!React.isValidElement(child)) return;
		const props = child.props as Record<string, unknown> & {
			children?: React.ReactNode;
		};
		if (child.type === React.Fragment) {
			collectSelectOptions(props.children, out, group);
			return;
		}
		if (child.type === "optgroup") {
			collectSelectOptions(props.children, out, String(props.label ?? ""));
			return;
		}
		if (child.type !== "option") return;
		const text = textOf(props.children).trim();
		out.push({
			value:
				props.value === undefined || props.value === null
					? text
					: String(props.value),
			label: props.children,
			text,
			disabled: Boolean(props.disabled),
			hidden: Boolean(props.hidden),
			group,
		});
	});
	return out;
}

export type SelectProps = Omit<
	React.ComponentProps<"select">,
	"multiple" | "size" | "ref" | "value" | "defaultValue"
> & {
	ref?: React.Ref<HTMLInputElement | HTMLSelectElement>;
	value?: string | number | readonly string[] | null;
	defaultValue?: string | number | readonly string[];
	/** Texto quando nenhuma opção bate com o valor. */
	placeholder?: string;
};

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
	if (!ref) return;
	if (typeof ref === "function") ref(value);
	else (ref as React.RefObject<T | null>).current = value;
}

function makeChangeEvent(target: HTMLInputElement, type: "change" | "blur") {
	return {
		type,
		target,
		currentTarget: target,
		nativeEvent: new Event(type),
		bubbles: true,
		cancelable: false,
		defaultPrevented: false,
		isDefaultPrevented: () => false,
		isPropagationStopped: () => false,
		preventDefault: () => {},
		stopPropagation: () => {},
		persist: () => {},
	} as unknown as React.ChangeEvent<HTMLSelectElement> &
		React.FocusEvent<HTMLSelectElement>;
}

/**
 * Drop-in do `<select>`: aceita `<option>` como filhos e devolve
 * `onChange(e)` com `e.target.value`. O `ref` aponta para um `<input
 * type="hidden">` cujo `value` é observado — assim `register()` do RHF,
 * `reset()` e `setValue()` continuam funcionando sem `Controller`.
 */
function Select({
	className,
	children,
	value,
	defaultValue,
	onChange,
	onBlur,
	onFocus,
	name,
	id,
	disabled,
	required,
	placeholder,
	ref,
	form,
	autoComplete: _autoComplete,
	...triggerProps
}: SelectProps) {
	const options = collectSelectOptions(children);
	const firstValue = options.find((o) => !o.disabled && !o.hidden)?.value;
	const isControlled = value !== undefined;
	const [internal, setInternal] = React.useState<string>(() =>
		defaultValue !== undefined
			? String(defaultValue)
			: (firstValue ?? options[0]?.value ?? ""),
	);
	const controlledRef = React.useRef(isControlled);
	controlledRef.current = isControlled;
	const inputRef = React.useRef<HTMLInputElement | null>(null);
	const triggerRef = React.useRef<HTMLButtonElement | null>(null);

	const current = isControlled ? String(value ?? "") : internal;
	const selected = options.find((o) => o.value === current);
	// Igual ao nativo: valor fora da lista mostra a primeira opção.
	const display = selected ?? (placeholder ? undefined : options[0]);

	const setHiddenRef = React.useCallback(
		(node: HTMLInputElement | null) => {
			inputRef.current = node;
			if (node) {
				// Observa escritas programáticas (RHF `reset`/`setValue`, ref.value = x)
				// encadeando no descritor que já existir (o React rastreia `value`).
				const base =
					Object.getOwnPropertyDescriptor(node, "value") ??
					Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
				if (base?.get && base.set && !("__dsSelect" in node)) {
					const { get, set } = base;
					Object.defineProperty(node, "value", {
						configurable: true,
						enumerable: base.enumerable,
						get() {
							return get.call(node);
						},
						set(next: unknown) {
							const str =
								next === null || next === undefined ? "" : String(next);
							set.call(node, str);
							if (!controlledRef.current) setInternal(str);
						},
					});
					Object.defineProperty(node, "__dsSelect", { value: true });
					// RHF foca o campo com erro: leva o foco pro gatilho visível.
					node.focus = () => triggerRef.current?.focus();
				}
			}
			assignRef(ref as React.Ref<HTMLInputElement>, node);
		},
		[ref],
	);

	return (
		<SelectRoot
			value={current}
			onValueChange={(next) => {
				const input = inputRef.current;
				const str = next === null || next === undefined ? "" : String(next);
				if (input) input.value = str;
				else if (!controlledRef.current) setInternal(str);
				if (input) onChange?.(makeChangeEvent(input, "change"));
			}}
			onOpenChange={(open) => {
				if (!open && inputRef.current)
					onBlur?.(makeChangeEvent(inputRef.current, "blur"));
			}}
			disabled={disabled}
			required={required}
		>
			<input
				ref={setHiddenRef}
				type="hidden"
				name={name}
				form={form}
				defaultValue={current}
				data-slot="select-input"
			/>
			<SelectTrigger
				ref={triggerRef}
				id={id}
				className={className}
				onFocus={
					onFocus as unknown as React.FocusEventHandler<HTMLButtonElement>
				}
				{...(triggerProps as SelectPrimitive.Trigger.Props)}
			>
				<SelectValue>
					{() =>
						display ? (
							display.label
						) : (
							<span className="text-muted-foreground">{placeholder}</span>
						)
					}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{options
					.filter((o) => !o.hidden)
					.map((o) => (
						<SelectItem
							key={`${o.group ?? ""}:${o.value}`}
							value={o.value}
							label={o.text}
							disabled={o.disabled}
						>
							{o.label}
						</SelectItem>
					))}
			</SelectContent>
		</SelectRoot>
	);
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectGroupLabel,
	SelectItem,
	SelectRoot,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
};
