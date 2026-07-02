import { GluestackUIProvider } from './components/ui/gluestack-ui-provider';
import { useHashRoute } from './state/appStore';
import { TourShelf } from './screens/TourShelf';
import { TourDetail } from './screens/TourDetail';
import { MapScreen } from './screens/MapScreen';

export default function App() {
  const route = useHashRoute();

  return (
    <GluestackUIProvider mode="system">
      {route.name === 'shelf' && <TourShelf />}
      {route.name === 'tour-detail' && <TourDetail tourId={route.tourId} />}
      {route.name === 'map' && <MapScreen tourId={route.tourId} />}
    </GluestackUIProvider>
  );
}
