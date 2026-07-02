import { useEffect } from 'react';
import { GluestackUIProvider } from './components/ui/gluestack-ui-provider';
import { useHashRoute } from './state/appStore';
import { useDownloadStore } from './state/downloadStore';
import { TourShelf } from './screens/TourShelf';
import { TourDetail } from './screens/TourDetail';
import { MapScreen } from './screens/MapScreen';

const LEGACY_KEYS = ['ynp-tour-visited', 'ynp-tour-pos'] as const;

function clearLegacyStorage(): void {
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

function useDownloadBootstrap(): void {
  const init = useDownloadStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ga-cleanup-legacy') clearLegacyStorage();
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);
}

export default function App() {
  const route = useHashRoute();
  useDownloadBootstrap();

  return (
    <GluestackUIProvider mode="system">
      {route.name === 'shelf' && <TourShelf />}
      {route.name === 'tour-detail' && <TourDetail key={route.tourId} tourId={route.tourId} />}
      {route.name === 'map' && <MapScreen key={route.tourId} tourId={route.tourId} />}
    </GluestackUIProvider>
  );
}
