'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AuthUser } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  _hasHydrated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      _hasHydrated: false,
      setAuth: (user, token) => {
        localStorage.setItem('joola_token', token);
        set({ user, token });
      },
      clearAuth: () => {
        localStorage.removeItem('joola_token');
        set({ user: null, token: null });
      },
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'joola-auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
