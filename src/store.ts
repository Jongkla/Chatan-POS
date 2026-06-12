import { create } from 'zustand';
import { User } from './lib/api';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  theme: 'dark',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
}));
