import { useSyncExternalStore } from 'react';

type Toast = { id: number; text: string };
let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string) {
  const id = nextId++;
  toasts = [...toasts, { id, text }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 4000);
}

export function useToasts() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => toasts,
  );
}

export const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Something went wrong');
