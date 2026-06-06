import { create } from 'zustand';

export interface Point {
  x: number;
  y: number;
  time: number;
}

interface DemoLensState {
  isRecording: boolean;
  isProcessing: boolean;
  mousePath: Point[];
  clicks: Point[];
  setIsRecording: (isRecording: boolean) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  addMousePoint: (point: Point) => void;
  addClick: (point: Point) => void;
  resetStore: () => void;
}

export const useStore = create<DemoLensState>((set) => ({
  isRecording: false,
  isProcessing: false,
  mousePath: [],
  clicks: [],
  setIsRecording: (isRecording) => set({ isRecording }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  addMousePoint: (point) => set((state) => ({ mousePath: [...state.mousePath, point] })),
  addClick: (point) => set((state) => ({ clicks: [...state.clicks, point] })),
  resetStore: () => set({ isRecording: false, isProcessing: false, mousePath: [], clicks: [] }),
}));
