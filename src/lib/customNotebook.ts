import {
  bulkUpdateParticipantCustomFieldOrder,
  listParticipantCustomFields,
  listParticipantCustomValues,
  removeParticipantCustomField,
  removeParticipantCustomValue,
  subscribeParticipantCustomFields,
  subscribeParticipantCustomValues,
  upsertParticipantCustomField,
  upsertParticipantCustomValue,
  findParticipantCustomValueById,
} from './memoryStore';
import {
  remoteDeleteCustomField,
  remoteDeleteCustomValue,
  remoteUpsertCustomFields,
  remoteUpsertCustomValues,
} from './remoteStore';
import { hydrateFromRemote, syncInBackground } from './remoteSync';
import type {
  ParticipantCustomField,
  ParticipantCustomFieldConstraints,
  ParticipantCustomFieldType,
  ParticipantCustomValue,
} from './types';

type FieldListener = (fields: ParticipantCustomField[]) => void;
type ValueListener = (entries: ParticipantCustomValue[]) => void;

export type CustomFieldDraft = {
  label: string;
  type: ParticipantCustomFieldType;
  description?: string;
  constraints?: ParticipantCustomFieldConstraints;
  isRequired?: boolean;
};

export type CustomFieldPatch = Partial<CustomFieldDraft> & {
  order?: number;
  isArchived?: boolean;
};

export type CustomValueDraft = {
  id?: string;
  value: string;
  metadata?: Record<string, unknown>;
};

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeConstraints(constraints?: ParticipantCustomFieldConstraints) {
  if (!constraints) return {};
  if (typeof constraints !== 'object') return {};
  return { ...constraints };
}

function selectField(id: string) {
  return listParticipantCustomFields().find((field) => field.id === id);
}

export function getNotebookFields() {
  return listParticipantCustomFields();
}

export function listenNotebookFields(listener: FieldListener) {
  return subscribeParticipantCustomFields(listener);
}

export function getNotebookEntries(code: string) {
  return listParticipantCustomValues(code);
}

export function listenNotebookEntries(code: string, listener: ValueListener) {
  return subscribeParticipantCustomValues(code.toUpperCase(), listener);
}

export async function createNotebookField(draft: CustomFieldDraft) {
  const label = draft.label.trim();
  if (!label) {
    throw new Error('Label é obrigatório.');
  }
  const existing = listParticipantCustomFields();
  const nextOrder = existing.length > 0 ? Math.max(...existing.map((field) => field.order)) + 1 : 0;
  const now = new Date();
  const field: ParticipantCustomField = {
    id: generateId(),
    label,
    type: draft.type,
    description: draft.description?.trim() || undefined,
    constraints: sanitizeConstraints(draft.constraints),
    order: nextOrder,
    isRequired: Boolean(draft.isRequired),
    isArchived: false,
    createdBy: undefined,
    createdAt: now,
    updatedBy: undefined,
    updatedAt: now,
  };

  upsertParticipantCustomField(field);

  try {
    await remoteUpsertCustomFields([
      {
        id: field.id,
        label: field.label,
        type: field.type,
        description: field.description ?? '',
        constraints: field.constraints,
        order: field.order,
        isRequired: field.isRequired,
        isArchived: field.isArchived,
      },
    ]);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }

  return field;
}

export async function updateNotebookField(id: string, patch: CustomFieldPatch) {
  const current = selectField(id);
  if (!current) throw new Error('Campo não encontrado.');

  const updated: ParticipantCustomField = {
    ...current,
    label: patch.label !== undefined ? patch.label.trim() || current.label : current.label,
    type: patch.type ?? current.type,
    description: patch.description !== undefined ? patch.description?.trim() || undefined : current.description,
    constraints: patch.constraints ? sanitizeConstraints(patch.constraints) : current.constraints,
    order: patch.order ?? current.order,
    isRequired: patch.isRequired ?? current.isRequired,
    isArchived: patch.isArchived ?? current.isArchived,
    updatedAt: new Date(),
  };

  upsertParticipantCustomField(updated);

  try {
    await remoteUpsertCustomFields([
      {
        id: updated.id,
        label: updated.label,
        type: updated.type,
        description: updated.description ?? '',
        constraints: updated.constraints,
        order: updated.order,
        isRequired: updated.isRequired,
        isArchived: updated.isArchived,
      },
    ]);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }

  return updated;
}

export async function reorderNotebookFields(order: string[]) {
  const orderEntries = order.map((id, index) => ({ id, order: index }));
  bulkUpdateParticipantCustomFieldOrder(orderEntries);

  try {
    await remoteUpsertCustomFields(orderEntries);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }
}

export async function archiveNotebookField(id: string) {
  await updateNotebookField(id, { isArchived: true });
}

export async function deleteNotebookField(id: string) {
  const snapshot = selectField(id);
  if (!snapshot) return;
  removeParticipantCustomField(id);
  try {
    await remoteDeleteCustomField(id);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }
}

export async function saveNotebookEntry(code: string, fieldId: string, draft: CustomValueDraft) {
  const normalizedCode = code.toUpperCase().trim();
  if (!normalizedCode) throw new Error('Código é obrigatório.');
  const field = selectField(fieldId);
  if (!field) throw new Error('Campo não encontrado.');

  const now = new Date();
  const existing = draft.id ? findParticipantCustomValueById(draft.id) : null;
  const id = draft.id ?? generateId();
  const entry: ParticipantCustomValue = {
    id,
    code: normalizedCode,
    fieldId,
    value: draft.value,
    metadata: draft.metadata ? { ...draft.metadata } : existing?.metadata ?? {},
    createdBy: existing?.createdBy,
    createdAt: existing?.createdAt ?? now,
    updatedBy: existing?.updatedBy,
    updatedAt: now,
  };

  upsertParticipantCustomValue(entry);

  try {
    await remoteUpsertCustomValues([
      {
        id: entry.id,
        code: entry.code,
        fieldId: entry.fieldId,
        value: entry.value,
        metadata: entry.metadata ?? {},
      },
    ]);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }

  return entry;
}

export async function deleteNotebookEntry(id: string) {
  const existing = findParticipantCustomValueById(id);
  if (!existing) return;
  removeParticipantCustomValue(id);
  try {
    await remoteDeleteCustomValue(id);
    syncInBackground();
  } catch (error) {
    await hydrateFromRemote();
    throw error;
  }
}
