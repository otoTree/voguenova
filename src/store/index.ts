import { create } from 'zustand'

export interface ModelPersona {
  id: string;
  name: string;
  style: string;
  backstory: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface ShootImage {
  id: string;
  modelId: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
}

interface AppState {
  currentModel: ModelPersona | null;
  models: ModelPersona[];
  setCurrentModel: (model: ModelPersona | null) => void;
  addModel: (model: ModelPersona) => void;
  shoots: ShootImage[];
  addShoot: (shoot: ShootImage) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentModel: null,
  models: [],
  setCurrentModel: (model) => set({ currentModel: model }),
  addModel: (model) => set((state) => ({ models: [...state.models, model] })),
  shoots: [],
  addShoot: (shoot) => set((state) => ({ shoots: [...state.shoots, shoot] })),
}))
