import { useEffect, useState } from 'react';
import { create } from 'zustand';

export type AppRoute =
  | { name: 'shelf' }
  | { name: 'tour-detail'; tourId: string }
  | { name: 'map'; tourId: string };

interface AppState {
  activeTourId: string | null;
  setActiveTourId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTourId: null,
  setActiveTourId: (id) => set({ activeTourId: id }),
}));

export function parseHashRoute(hash: string): AppRoute {
  const path = hash.replace(/^#\/?/, '').replace(/\/$/, '');
  if (!path) return { name: 'shelf' };
  const parts = path.split('/');
  if (parts[0] === 'tour' && parts.length === 2) {
    return { name: 'tour-detail', tourId: parts[1] };
  }
  if (parts[0] === 'tour' && parts.length === 3 && parts[2] === 'map') {
    return { name: 'map', tourId: parts[1] };
  }
  return { name: 'shelf' };
}

export function routeToHash(route: AppRoute): string {
  switch (route.name) {
    case 'shelf':
      return '#/';
    case 'tour-detail':
      return `#/tour/${route.tourId}`;
    case 'map':
      return `#/tour/${route.tourId}/map`;
  }
}

export function useHashRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined' ? parseHashRoute(window.location.hash) : { name: 'shelf' }
  );

  useEffect(() => {
    const onHashChange = () => setRoute(parseHashRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) {
      window.location.hash = '#/';
    }
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}

export function navigate(route: AppRoute) {
  window.location.hash = routeToHash(route);
}
