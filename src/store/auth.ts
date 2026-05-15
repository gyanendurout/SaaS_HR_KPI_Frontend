'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AuthUser } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('joola_token', token);
        set({ user, token });
      },
      clearAuth: () => {
        localStorage.removeItem('joola_token');
        set({ user: null, token: null });
      },
    }),
    { name: 'joola-auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);
