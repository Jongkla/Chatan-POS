import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from './lib/api';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'pos-store',
    }
  )
);
