import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle2,
  GripVertical,
  LayoutGrid,
  Loader2,
  NotebookPen,
  Plus,
  Save,
  X,
} from 'lucide-react';
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import DatePicker from 'react-datepicker';
import {
  archiveNotebookField,
  createNotebookField,
  deleteNotebookEntry,
  listenNotebookEntries,
  listenNotebookFields,
  reorderNotebookFields,
  saveNotebookEntry,
} from '../../lib/customNotebook';
import type { ParticipantCustomField, ParticipantCustomValue } from '../../lib/types';
import { ParticipantFieldBuilderModal } from './ParticipantFieldBuilderModal';

type ValueState = {
  id?: string;
  value: string;
  draft: string;
  dirty: boolean;
  saving: boolean;
  error?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  participant: {
    code: string;
    displayName: string;
  } | null;
};

function formatDateTime(date?: Date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

function normalizeDateInput(value: Date | null): string {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function validateValue(field: ParticipantCustomField, value: string) {
  const trimmed = value.trim();
  if (field.isRequired && trimmed.length === 0) {
    return 'Este campo é obrigatório.';
  }
  if (trimmed.length === 0) return null;

  const constraints = field.constraints ?? {};

  switch (field.type) {
    case 'text':
    case 'textarea': {
      const maxLength = typeof constraints.maxLength === 'number' ? constraints.maxLength : undefined;
      if (maxLength && trimmed.length > maxLength) {
        return `Limite de ${maxLength} caracteres excedido.`;
      }
      return null;
    }
    case 'number': {
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) return 'Informe um número válido.';
      const min = typeof constraints.min === 'number' ? constraints.min : undefined;
      const max = typeof constraints.max === 'number' ? constraints.max : undefined;
      if (min !== undefined && numeric < min) return `Valor mínimo permitido: ${min}.`;
      if (max !== undefined && numeric > max) return `Valor máximo permitido: ${max}.`;
      return null;
    }
    case 'cpf': {
      const digits = sanitizeDigits(trimmed);
      if (digits.length !== 11) return 'Informe um CPF com 11 dígitos.';
      return null;
    }
    case 'rg': {
      const digits = sanitizeDigits(trimmed);
      if (digits.length < 7 || digits.length > 12) return 'Informe um RG válido.';
      return null;
    }
    case 'phone': {
      const digits = sanitizeDigits(trimmed);
      if (digits.length < 10 || digits.length > 11) return 'Informe um telefone com DDD.';
      return null;
    }
    case 'email': {
      const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return pattern.test(trimmed) ? null : 'Informe um e-mail válido.';
    }
    case 'url': {
      try {
        const url = new URL(trimmed);
        if (!url.protocol.startsWith('http')) return 'Use http ou https.';
        return null;
      } catch {
        return 'Informe uma URL válida.';
      }
    }
    case 'date': {
      const parsed = parseDateValue(trimmed);
      if (!parsed) return 'Informe uma data válida.';
      const min = constraints.min ? new Date(String(constraints.min)) : null;
      const max = constraints.max ? new Date(String(constraints.max)) : null;
      if (min && parsed < min) return `Data mínima: ${formatDateTime(min).split(' ')[0]}.`;
      if (max && parsed > max) return `Data máxima: ${formatDateTime(max).split(' ')[0]}.`;
      return null;
    }
    default:
      return null;
  }
}

function normalizeForStorage(field: ParticipantCustomField, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  switch (field.type) {
    case 'cpf':
    case 'rg':
    case 'phone':
      return sanitizeDigits(trimmed);
    case 'number': {
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? String(numeric) : trimmed;
    }
    default:
      return trimmed;
  }
}

type OrderingItem = ParticipantCustomField;

export function ParticipantNotebookModal({ isOpen, onClose, participant }: Props) {
  const [fields, setFields] = useState<ParticipantCustomField[]>([]);
  const [entries, setEntries] = useState<ParticipantCustomValue[]>([]);
  const [valueState, setValueState] = useState<Record<string, ValueState>>({});
  const [initializing, setInitializing] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderingItems, setOrderingItems] = useState<OrderingItem[]>([]);
  const [orderingLoading, setOrderingLoading] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const activeFields = useMemo(
    () => fields.filter((field) => !field.isArchived),
    [fields],
  );

  useEffect(() => {
    if (!isOpen || !participant) return;
    setInitializing(true);
    const stopFields = listenNotebookFields((nextFields) => {
      setFields(nextFields);
      setInitializing(false);
    });
    const stopValues = listenNotebookEntries(participant.code, (nextValues) => {
      setEntries(nextValues);
    });
    return () => {
      stopFields();
      stopValues();
      setFields([]);
      setEntries([]);
      setValueState({});
      setIsOrdering(false);
      setOrderingItems([]);
      setGlobalError(null);
    };
  }, [isOpen, participant]);

  useEffect(() => {
    if (!isOpen) return;
    setValueState((prev) => {
      const next: Record<string, ValueState> = {};
      activeFields.forEach((field) => {
        const entry = entries.find((item) => item.fieldId === field.id) ?? null;
        const baseValue = entry?.value ?? '';
        const previous = prev[field.id];
        const draft = previous?.dirty ? previous.draft : baseValue;
        next[field.id] = {
          id: entry?.id,
          value: baseValue,
          draft,
          dirty: draft !== baseValue,
          saving: previous?.saving ? entry?.value !== previous.draft : false,
          error: previous?.dirty ? previous.error : null,
          metadata: entry?.metadata ?? previous?.metadata ?? {},
          createdAt: entry?.createdAt ?? previous?.createdAt,
          updatedAt: entry?.updatedAt ?? previous?.updatedAt,
          createdBy: entry?.createdBy ?? previous?.createdBy,
          updatedBy: entry?.updatedBy ?? previous?.updatedBy,
        };
      });
      return next;
    });
  }, [activeFields, entries, isOpen]);

  useEffect(() => {
    if (isOrdering) {
      setOrderingItems(activeFields);
    }
  }, [isOrdering, activeFields]);

  const handleDraftChange = (fieldId: string, draftValue: string) => {
    setValueState((prev) => {
      const current = prev[fieldId];
      if (!current) return prev;
      const nextDraft = draftValue;
      return {
        ...prev,
        [fieldId]: {
          ...current,
          draft: nextDraft,
          dirty: nextDraft !== current.value,
          error: null,
        },
      };
    });
  };

  const handleDateChange = (fieldId: string, value: Date | null) => {
    const serialized = normalizeDateInput(value);
    handleDraftChange(fieldId, serialized);
  };

  const handleSaveValue = async (field: ParticipantCustomField) => {
    const current = valueState[field.id];
    if (!current) return;
    const errorMessage = validateValue(field, current.draft);
    if (errorMessage) {
      setValueState((prev) => ({
        ...prev,
        [field.id]: { ...current, error: errorMessage },
      }));
      return;
    }

    const normalized = normalizeForStorage(field, current.draft);
    setValueState((prev) => ({
      ...prev,
      [field.id]: { ...current, saving: true, error: null },
    }));
    try {
      await saveNotebookEntry(participant!.code, field.id, {
        id: current.id,
        value: normalized,
        metadata: current.metadata ?? {},
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar.';
      setValueState((prev) => ({
        ...prev,
        [field.id]: { ...current, saving: false, error: message },
      }));
    }
  };

  const handleClearValue = async (field: ParticipantCustomField) => {
    handleDraftChange(field.id, '');
    await handleSaveValue(field);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(orderingItems);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setOrderingItems(items);
  };

  const handleSaveOrdering = async () => {
    if (!isOrdering) return;
    setOrderingLoading(true);
    try {
      await reorderNotebookFields(orderingItems.map((item) => item.id));
      setIsOrdering(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao reorganizar campos.';
      setGlobalError(message);
    } finally {
      setOrderingLoading(false);
    }
  };

  const handleCreateField = async (draft: Parameters<typeof createNotebookField>[0]) => {
    setGlobalError(null);
    await createNotebookField(draft);
  };

  const handleArchiveFieldClick = async (fieldId: string) => {
    try {
      await archiveNotebookField(fieldId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível arquivar o campo.';
      setGlobalError(message);
    }
  };

  const handleDeleteValue = async (fieldId: string) => {
    const current = valueState[fieldId];
    if (!current?.id) {
      handleDraftChange(fieldId, '');
      return;
    }
    handleDraftChange(fieldId, '');
    try {
      await deleteNotebookEntry(current.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível remover.';
      setValueState((prev) => ({
        ...prev,
        [fieldId]: { ...current, error: message },
      }));
    }
  };

  if (!participant) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="participant-notebook"
            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-theme-surface border border-theme rounded-3xl shadow-2xl flex flex-col"
            >
              <div className="px-6 pt-6 pb-4 border-b border-theme flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-3">
                    <NotebookPen className="w-5 h-5 text-blue-500" />
                    Ficha personalizada
                  </h2>
                  <div className="text-sm text-theme-secondary">
                    {participant.displayName} · Código {participant.code}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsOrdering((prev) => !prev)}
                    className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors ${
                      isOrdering
                        ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                        : 'border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover'
                    }`}
                  >
                    <LayoutGrid size={16} />
                    Organizar campos
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFieldModalOpen(true)}
                    className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm flex items-center gap-2 hover:bg-blue-600 transition-colors"
                  >
                    <Plus size={16} />
                    Novo campo
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 rounded-lg border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors flex items-center gap-2"
                  >
                    <X size={16} />
                    Fechar
                  </button>
                </div>
              </div>

              {globalError && (
                <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/30 text-sm text-red-500">
                  {globalError}
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 scrollbar-thin scrollbar-thumb-theme-dark/40 scrollbar-track-transparent">
                {initializing ? (
                  <div className="h-64 flex flex-col items-center justify-center text-theme-secondary gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Carregando fichário personalizado...
                  </div>
                ) : (
                  <>
                    {isOrdering ? (
                      <div className="border border-dashed border-theme rounded-2xl p-5 bg-theme-base/60">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <GripVertical className="w-5 h-5 text-theme-secondary" />
                              Reorganizar campos
                            </h3>
                            <p className="text-sm text-theme-secondary">
                              Arraste e solte para definir a ordem de exibição no fichário.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setIsOrdering(false)}
                              className="px-3 py-2 rounded-lg border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors"
                              disabled={orderingLoading}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveOrdering}
                              className="px-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                              disabled={orderingLoading}
                            >
                              {orderingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                              Salvar ordem
                            </button>
                          </div>
                        </div>

                        <DragDropContext onDragEnd={handleDragEnd}>
                          <Droppable droppableId="notebook-fields">
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                                {orderingItems.map((item, index) => (
                                  <Draggable key={item.id} draggableId={item.id} index={index}>
                                    {(dragProvided, snapshot) => (
                                      <div
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                        {...dragProvided.dragHandleProps}
                                        className={`rounded-xl border bg-theme-surface px-4 py-3 flex items-center justify-between ${
                                          snapshot.isDragging ? 'border-blue-400 shadow-lg' : 'border-theme'
                                        }`}
                                      >
                                        <div>
                                          <div className="font-medium">{item.label}</div>
                                          <div className="text-xs text-theme-secondary uppercase tracking-wide">
                                            {item.type}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeFields.length === 0 ? (
                          <div className="border border-dashed border-theme rounded-2xl py-16 text-center text-theme-secondary space-y-3">
                            <NotebookPen className="w-8 h-8 mx-auto opacity-60" />
                            <div className="text-lg font-medium">Nenhum campo cadastrado ainda</div>
                            <p className="text-sm max-w-lg mx-auto">
                              Crie campos personalizados para montar o fichário completo da pessoa e registrar
                              informações relevantes, documentos ou histórico familiar.
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsFieldModalOpen(true)}
                              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
                            >
                              <Plus size={16} />
                              Criar primeiro campo
                            </button>
                          </div>
                        ) : (
                          activeFields.map((field) => {
                            const state = valueState[field.id];
                            const draft = state?.draft ?? '';
                            const error = state?.error ?? null;
                            const isDirty = Boolean(state?.dirty);
                            const isSaving = Boolean(state?.saving);
                            const baseValue = state?.value ?? '';
                            const updatedAt = state?.updatedAt;
                            const updatedBy = state?.updatedBy;
                            const createdAt = field.createdAt;
                            return (
                              <div
                                key={field.id}
                                className="border border-theme rounded-2xl p-4 bg-theme-base/60 backdrop-blur space-y-4"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <div className="text-base font-semibold flex items-center gap-2">
                                      {field.label}
                                      {field.isRequired && (
                                        <span className="text-[11px] font-medium uppercase tracking-wide text-red-500">
                                          obrigatório
                                        </span>
                                      )}
                                    </div>
                                    {field.description && (
                                      <p className="text-sm text-theme-secondary">{field.description}</p>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleArchiveFieldClick(field.id)}
                                      className="px-3 py-1.5 text-xs rounded-lg border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors"
                                    >
                                      Arquivar
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {field.type === 'textarea' ? (
                                    <textarea
                                      rows={4}
                                      value={draft}
                                      onChange={(event) => handleDraftChange(field.id, event.target.value)}
                                      className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                      placeholder="Escreva aqui..."
                                    />
                                  ) : field.type === 'date' ? (
                                    <div className="flex items-center gap-2">
                                      <DatePicker
                                        selected={parseDateValue(draft)}
                                        onChange={(value) => handleDateChange(field.id, value)}
                                        dateFormat="dd/MM/yyyy"
                                        placeholderText="Selecionar data"
                                        className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                      <Calendar className="w-4 h-4 text-theme-secondary" />
                                    </div>
                                  ) : (
                                    <input
                                      type={
                                        field.type === 'number'
                                          ? 'number'
                                          : field.type === 'email'
                                          ? 'email'
                                          : field.type === 'url'
                                          ? 'url'
                                          : 'text'
                                      }
                                      value={draft}
                                      onChange={(event) => handleDraftChange(field.id, event.target.value)}
                                      className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="Informe o valor"
                                    />
                                  )}

                                  {error && (
                                    <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5">
                                      {error}
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="text-xs text-theme-secondary space-y-1">
                                    {updatedAt ? (
                                      <div>
                                        Última atualização em {formatDateTime(updatedAt)}
                                        {updatedBy ? ` · por ${updatedBy}` : ''}
                                      </div>
                                    ) : (
                                      <div>Nenhuma atualização registrada ainda.</div>
                                    )}
                                    {createdAt && (
                                      <div className="flex items-center gap-2 text-theme-muted">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Campo criado em {formatDateTime(createdAt)}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleClearValue(field)}
                                      className="px-3 py-1.5 rounded-lg border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors text-xs"
                                      disabled={isSaving || (!isDirty && !baseValue)}
                                    >
                                      Limpar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteValue(field.id)}
                                      className="px-3 py-1.5 rounded-lg border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors text-xs"
                                      disabled={isSaving || !state?.id}
                                    >
                                      Remover
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveValue(field)}
                                      className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
                                        isDirty
                                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                                          : 'bg-theme-surface text-theme-muted cursor-not-allowed opacity-60'
                                      }`}
                                      disabled={!isDirty || isSaving}
                                    >
                                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save size={14} />}
                                      Salvar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ParticipantFieldBuilderModal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        onSubmit={handleCreateField}
      />
    </>
  );
}
