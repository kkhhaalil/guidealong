import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Route, Stop, TourManifest } from '../types/tour.ts';
import { categoryIcon } from '../theme/categoryIcons.ts';
import { tourFileUrl } from '../downloads/tourSource.ts';

export interface MapViewProps {
  tourId: string;
  manifest: TourManifest;
  stops: Stop[];
  route: Route;
  position: { lat: number; lng: number } | null;
  heading: number | null;
  visited: string[];
  follow: boolean;
  onFollowChange: (follow: boolean) => void;
}

function stopIcon(stop: Stop, isVisited: boolean): L.DivIcon {
  const cls = isVisited ? 'ga-stop-marker ga-stop-marker--visited' : 'ga-stop-marker';
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<div class="${cls}">${categoryIcon(stop.category)}</div>`,
  });
}

function puckIcon(heading: number | null): L.DivIcon {
  const rot = heading != null ? heading : 0;
  return L.divIcon({
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `<div class="ga-puck" style="transform:rotate(${rot}deg)">▲</div>`,
  });
}

export function MapView({
  tourId,
  manifest,
  stops,
  route,
  position,
  heading,
  visited,
  follow,
  onFollowChange,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const puckRef = useRef<L.Marker | null>(null);
  const followRef = useRef(follow);

  useEffect(() => {
    followRef.current = follow;
  }, [follow]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const [lat, lng] = manifest.map.center;
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: manifest.map.minZoom + 1,
      minZoom: manifest.map.minZoom,
      maxZoom: manifest.map.maxZoom,
      maxBounds: manifest.map.bounds.map(([a, b]) => [a, b] as [number, number]),
      zoomControl: false,
    });

    L.tileLayer(tourFileUrl(tourId, 'tiles/{z}/{x}/{y}.png'), {
      attribution: manifest.map.attribution,
      minZoom: manifest.map.minZoom,
      maxZoom: manifest.map.maxZoom,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    routeLayerRef.current = L.polyline(route, { color: '#c44d2a', weight: 4, opacity: 0.85 }).addTo(map);

    for (const stop of stops) {
      const marker = L.marker([stop.lat, stop.lng], {
        icon: stopIcon(stop, false),
      }).addTo(map);
      markersRef.current.set(stop.id, marker);
    }

    puckRef.current = L.marker([lat, lng], { icon: puckIcon(null), zIndexOffset: 1000 }).addTo(map);

    const markers = markersRef.current;

    map.on('dragstart', () => onFollowChange(false));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      markers.clear();
      markersRef.current = markers;
      puckRef.current = null;
    };
  }, [tourId, manifest, stops, route, onFollowChange]);

  useEffect(() => {
    const visitedSet = new Set(visited);
    for (const stop of stops) {
      const marker = markersRef.current.get(stop.id);
      if (marker) marker.setIcon(stopIcon(stop, visitedSet.has(stop.id)));
    }
  }, [stops, visited]);

  useEffect(() => {
    if (!position || !puckRef.current || !mapRef.current) return;
    const latlng: L.LatLngExpression = [position.lat, position.lng];
    puckRef.current.setLatLng(latlng);
    puckRef.current.setIcon(puckIcon(heading));
    if (followRef.current) {
      mapRef.current.panTo(latlng, { animate: false });
    }
  }, [position, heading]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="leaflet-host h-full w-full" data-testid="map-container" />
      <button
        type="button"
        data-testid="follow-toggle"
        aria-pressed={follow}
        className={`absolute right-3 top-3 z-chrome flex h-12 w-12 items-center justify-center rounded-card bg-surface shadow-card text-xl ${
          follow ? 'ring-2 ring-primary' : ''
        }`}
        onClick={() => onFollowChange(true)}
      >
        📍
      </button>
    </div>
  );
}
