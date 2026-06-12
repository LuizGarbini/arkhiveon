import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Plus, Trash, Settings } from "lucide-react";
import { useState } from "react";
import { useRPGStore } from "@/lib/store";
import type { CustomTemplate, TemplateSection, TemplateField, FieldType } from "@/lib/store/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/templates/new")({
	component: NewTemplatePage,
});

const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: "text", label: "Texto Curto" },
  { type: "textarea", label: "Área de Texto" },
  { type: "number", label: "Número" },
  { type: "attribute_box", label: "Atributo Grande" },
  { type: "metric_box", label: "Métrica (Com Ícone)" },
  { type: "checkbox", label: "Caixa de Seleção" },
];

function NewTemplatePage() {
	const navigate = useNavigate();
	const addTemplate = useRPGStore((state) => state.addTemplate);
    const generateId = () => Math.random().toString(36).substr(2, 9);
    
    const [name, setName] = useState("Meu Novo Sistema");
    const [description, setDescription] = useState("");
    
    const [sections, setSections] = useState<TemplateSection[]>([
        { id: generateId(), title: "Identidade", fields: [] }
    ]);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleAddSection() {
        setSections([...sections, { id: generateId(), title: "Nova Seção", fields: [] }]);
    }

    function handleRemoveSection(id: string) {
        setSections(sections.filter(s => s.id !== id));
        setSelectedFieldId(null);
    }

    function handleUpdateSectionTitle(id: string, title: string) {
        setSections(sections.map(s => s.id === id ? { ...s, title } : s));
    }

    function handleAddField(sectionId: string, type: FieldType) {
        const newField: TemplateField = {
            id: generateId(),
            type,
            label: "Novo Campo",
            width: "full"
        };
        setSections(sections.map(s => {
            if (s.id === sectionId) return { ...s, fields: [...s.fields, newField] };
            return s;
        }));
        setSelectedFieldId(newField.id);
    }

    function handleUpdateField(fieldId: string, updates: Partial<TemplateField>) {
        setSections(sections.map(s => ({
            ...s,
            fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
        })));
    }

    function handleRemoveField(sectionId: string, fieldId: string) {
        setSections(sections.map(s => {
            if (s.id === sectionId) return { ...s, fields: s.fields.filter(f => f.id !== fieldId) };
            return s;
        }));
        if (selectedFieldId === fieldId) setSelectedFieldId(null);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id.toString();
        const overId = over.id.toString();

        if (activeId !== overId) {
            // Find section
            const section = sections.find(s => s.fields.some(f => f.id === activeId));
            if (!section) return;

            const oldIndex = section.fields.findIndex(f => f.id === activeId);
            const newIndex = section.fields.findIndex(f => f.id === overId);

            setSections(sections.map(s => {
                if (s.id === section.id) {
                    return { ...s, fields: arrayMove(s.fields, oldIndex, newIndex) };
                }
                return s;
            }));
        }
    }

    function handleSave() {
        if (!name.trim()) return;
        const template: CustomTemplate = {
            id: `custom_${generateId()}`,
            name,
            description,
            author: "You",
            sections,
            createdAt: Date.now()
        };
        addTemplate(template);
        navigate({ to: "/templates" });
    }

    const selectedField = sections.flatMap(s => s.fields).find(f => f.id === selectedFieldId);

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-background">
			<header className="shrink-0 px-6 py-6 sm:px-8 sm:py-8">
				<div className="relative mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-6 shadow-xl shadow-black/5 sm:p-8">
					<div className="pointer-events-none absolute -right-24 -top-24 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
					<div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-fuchsia-500/5 blur-3xl" />
					<div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
						<div className="min-w-0 max-w-3xl">
							<Link to="/templates" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-primary mb-4">
								<ArrowLeft className="h-3.5 w-3.5" />
								Voltar para templates
							</Link>
							<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
								<Plus className="h-3.5 w-3.5" />
								<span>Novo Template</span>
							</div>
							<div className="mt-4">
								<Input value={name} onChange={e => setName(e.target.value)} className="h-10 border-transparent bg-transparent px-0 font-display text-3xl font-bold tracking-tight text-foreground hover:border-border focus-visible:border-primary focus-visible:ring-0 sm:text-4xl" placeholder="Nome do Sistema" />
							</div>
							<div className="mt-2">
								<Input value={description} onChange={e => setDescription(e.target.value)} className="h-8 border-transparent bg-transparent px-0 text-[14px] leading-6 text-muted-foreground hover:border-border focus-visible:border-primary focus-visible:ring-0" placeholder="Adicione uma descrição para o template..." />
							</div>
						</div>
						<div className="shrink-0">
							<Button onClick={handleSave} className="gap-2">
								<Check className="h-4 w-4" /> Salvar Template
							</Button>
						</div>
					</div>
				</div>
			</header>

            <div className="flex flex-1 overflow-hidden">
                {/* CANVAS */}
                <main className="flex-1 overflow-y-auto bg-muted/20 p-8">
                    <div className="mx-auto max-w-4xl space-y-6">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            {sections.map(section => (
                                <div key={section.id} className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
                                    <div className="mb-4 flex items-center justify-between">
                                        <Input value={section.title} onChange={e => handleUpdateSectionTitle(section.id, e.target.value)} className="h-8 max-w-[200px] border-transparent bg-transparent px-0 text-lg font-bold hover:border-border focus-visible:ring-0" />
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSection(section.id)} className="text-muted-foreground hover:text-destructive">
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    
                                    <SortableContext items={section.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                        <div className="flex flex-wrap gap-3">
                                            {section.fields.map(field => (
                                                <SortableField key={field.id} field={field} isSelected={selectedFieldId === field.id} onSelect={() => setSelectedFieldId(field.id)} onRemove={() => handleRemoveField(section.id, field.id)} />
                                            ))}
                                            {section.fields.length === 0 && (
                                                <div className="w-full rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground bg-muted/10">
                                                    Nenhum campo nesta seção. Adicione clicando nos botões abaixo.
                                                </div>
                                            )}
                                        </div>
                                    </SortableContext>

                                    <div className="mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                                        <p className="w-full text-[11px] font-bold uppercase tracking-wider text-primary mb-1">
                                            <Plus className="inline mr-1 h-3 w-3" /> Adicionar Campo à Seção
                                        </p>
                                        {FIELD_TYPES.map(ft => (
                                            <Button key={ft.type} variant="secondary" size="sm" onClick={() => handleAddField(section.id, ft.type)} className="hover:bg-primary hover:text-primary-foreground transition-colors">
                                                {ft.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </DndContext>
                        <Button variant="outline" className="w-full border-dashed" onClick={handleAddSection}>
                            <Plus className="mr-2 h-4 w-4" /> Adicionar Seção
                        </Button>
                    </div>
                </main>

                {/* SIDEBAR DE PROPRIEDADES */}
                <aside className="w-80 shrink-0 border-l border-border/60 bg-card/80 p-6 shadow-xl backdrop-blur-md">
                    <h3 className="mb-6 flex items-center gap-2 font-display text-lg font-bold">
                        <Settings className="h-5 w-5 text-primary" /> Propriedades
                    </h3>
                    
                    {selectedField ? (
                        <div className="space-y-5">
                            <div>
                                <label htmlFor={`field-label-${selectedField.id}`} className="mb-1.5 block text-xs font-bold uppercase text-muted-foreground">Rótulo / Nome</label>
                                <Input id={`field-label-${selectedField.id}`} value={selectedField.label} onChange={e => handleUpdateField(selectedField.id, { label: e.target.value })} />
                            </div>
                            <div>
                                <label htmlFor={`field-width-${selectedField.id}`} className="mb-1.5 block text-xs font-bold uppercase text-muted-foreground">Largura</label>
                                <select 
                                    id={`field-width-${selectedField.id}`}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={selectedField.width || "full"}
                                    onChange={e => handleUpdateField(selectedField.id, { width: e.target.value as TemplateField["width"] })}
                                >
                                    <option value="full">100% (Linha inteira)</option>
                                    <option value="half">50% (Metade)</option>
                                    <option value="third">33% (Terço)</option>
                                    <option value="quarter">25% (Quarto)</option>
                                </select>
                            </div>
                            {(selectedField.type === "text" || selectedField.type === "number") && (
                                <div>
                                    <label htmlFor={`field-placeholder-${selectedField.id}`} className="mb-1.5 block text-xs font-bold uppercase text-muted-foreground">Placeholder (Opcional)</label>
                                    <Input id={`field-placeholder-${selectedField.id}`} value={selectedField.placeholder || ""} onChange={e => handleUpdateField(selectedField.id, { placeholder: e.target.value })} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-8 text-center flex flex-col items-center justify-center">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Settings className="h-6 w-6 text-primary" />
                            </div>
                            <p className="text-sm font-bold text-foreground mb-2">Nenhum campo selecionado</p>
                            <p className="text-xs text-muted-foreground">
                                Clique em qualquer campo que você criou na área central para editar seu rótulo e tamanho aqui.
                            </p>
                        </div>
                    )}
                </aside>
            </div>
		</div>
	);
}

function SortableField({ field, isSelected, onSelect, onRemove }: { field: TemplateField, isSelected: boolean, onSelect: () => void, onRemove: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    let widthClass = "w-full";
    if (field.width === "half") widthClass = "w-[calc(50%-6px)]";
    if (field.width === "third") widthClass = "w-[calc(33.333%-8px)]";
    if (field.width === "quarter") widthClass = "w-[calc(25%-9px)]";

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`group relative rounded-xl border p-3 transition-colors ${widthClass} ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-border bg-background hover:border-primary/50'} ${isDragging ? 'opacity-50' : ''}`}
        >
            <div className="mb-2 flex items-center justify-between">
                <div {...attributes} {...listeners} className="cursor-grab text-[10px] font-bold uppercase tracking-wider text-muted-foreground active:cursor-grabbing">
                    :: DRAG
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="hidden text-muted-foreground hover:text-destructive group-hover:block">
                    <Trash className="h-3 w-3" />
                </button>
            </div>
            
            <button type="button" className="block w-full text-left" onClick={onSelect}>
                <p className="mb-1 text-[11px] font-bold text-foreground">{field.label}</p>
                <div className="flex h-10 w-full items-center rounded-md border border-dashed border-border/60 bg-muted/30 px-3 text-xs text-muted-foreground">
                    {field.type}
                </div>
            </button>
        </div>
    );
}
