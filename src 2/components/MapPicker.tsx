// src/components/MapPicker.tsx (CORREGIDO)
'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import type { MapPickerProps } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

export const MapPicker: React.FC<MapPickerProps> = ({
  value,
  defaultCenter,
  zoom = 14,
  onChange,
  height = 360,
  markers = [],
  showRoute = false,
  routePoints = []
}) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any[]>([]);
  const LRef = useRef<any>(null);

  const cleanupMap = useCallback(() => {
    if (mapRef.current) {
      try {
        markersLayerRef.current.forEach(marker => marker?.remove());
        markersLayerRef.current = [];
        routeLayerRef.current?.remove();
        routeLayerRef.current = null;
        markerRef.current?.remove();
        markerRef.current = null;
        mapRef.current.remove();
        mapRef.current = null;
      } catch (error) {
        console.warn('Error cleaning up map:', error);
        mapRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (mapRef.current || !divRef.current || cancelled) return;
      try {
        const L = await import('leaflet');
        LRef.current = L;
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        } );
        if (cancelled) return;
        const center = value ?? defaultCenter;
        const map = L.map(divRef.current).setView([center.lat, center.lng], zoom);
        mapRef.current = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        } ).addTo(map);
        const marker = L.marker([center.lat, center.lng], { draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const p = marker.getLatLng();
          onChange?.({ lat: p.lat, lng: p.lng });
        });
        markerRef.current = marker;
        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          onChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      } catch (error) { console.error('Error initializing map:', error); }
    })();
    return () => {
      cancelled = true;
      cleanupMap();
    };
  }, [value, defaultCenter, zoom, onChange, cleanupMap]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !LRef.current) return;
    const p = value ?? defaultCenter;
    markerRef.current.setLatLng([p.lat, p.lng]);
    mapRef.current.setView([p.lat, p.lng]);
  }, [value, defaultCenter]);

  useEffect(() => {
    if (!mapRef.current || !LRef.current) return;
    const L = LRef.current;
    markersLayerRef.current.forEach(marker => marker?.remove());
    markersLayerRef.current = [];
    markers.forEach((markerData, index) => {
      try {
        const icon = markerData.color ? L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: ${markerData.color}; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">${index + 1}</div>`,
          iconSize: [25, 25],
          iconAnchor: [12.5, 12.5]
        }) : undefined;
        const marker = L.marker([markerData.position.lat, markerData.position.lng], icon ? { icon } : {}).addTo(mapRef.current);
        if (markerData.label) marker.bindPopup(markerData.label);
        markersLayerRef.current.push(marker);
      } catch (error) { console.warn('Error adding marker:', error); }
    });
  }, [markers]);

  useEffect(() => {
    if (!mapRef.current || !LRef.current || !showRoute) return;
    const L = LRef.current;
    routeLayerRef.current?.remove();
    routeLayerRef.current = null;
    if (routePoints.length > 1) {
      try {
        const polyline = L.polyline(routePoints.map(point => [point.lat, point.lng]), { color: '#3b82f6', weight: 4, opacity: 0.7 }).addTo(mapRef.current);
        routeLayerRef.current = polyline;
        mapRef.current.fitBounds(polyline.getBounds(), { padding: [20, 20] });
      } catch (error) { console.warn('Error adding route:', error); }
    }
  }, [showRoute, routePoints]);

  return <div ref={divRef} style={{ width: '100%', height }} className="rounded-lg overflow-hidden border border-white/10" />;
};

export default MapPicker; // <-- EXPORTACIÓN POR DEFECTO
