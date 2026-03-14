import { create } from 'zustand';
import type { Label } from '../types';
import { getDb } from '../db/client';
import * as labelsDb from '../db/labels';

interface LabelStore {
  labels: Label[];
  loadLabels(): Promise<void>;
  addLabel(name: string, color: string): Promise<Label>;
  deleteLabel(id: string): Promise<void>;
}

export const useLabelStore = create<LabelStore>((set) => ({
  labels: [],

  async loadLabels() {
    const db = await getDb();
    const labels = await labelsDb.getAllLabels(db);
    set({ labels });
  },

  async addLabel(name, color) {
    const db = await getDb();
    const label = await labelsDb.insertLabel(db, name, color);
    set((s) => ({ labels: [...s.labels, label] }));
    return label;
  },

  async deleteLabel(id) {
    const db = await getDb();
    await labelsDb.deleteLabel(db, id);
    set((s) => ({ labels: s.labels.filter((l) => l.id !== id) }));
  },
}));
