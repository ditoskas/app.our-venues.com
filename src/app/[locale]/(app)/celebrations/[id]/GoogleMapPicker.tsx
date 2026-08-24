"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { loadGoogleMaps } from "@/lib/googleMaps";

export interface GoogleMapPickerHandle {
  geocode: (address: string) => void;
}

// Athens — a reasonable default center when no point is set yet.
const DEFAULT_CENTER = { lat: 37.9838, lng: 23.7275 };

const GoogleMapPicker = forwardRef<
  GoogleMapPickerHandle,
  {
    lat?: number;
    lng?: number;
    onChange: (lat: number, lng: number) => void;
  }
>(function GoogleMapPicker({ lat, lng, onChange }, ref) {
  const t = useTranslations("celebrations.events.map");
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<google.maps.Map | null>(null);
  const markerObj = useRef<google.maps.Marker | null>(null);
  const geocoderObj = useRef<google.maps.Geocoder | null>(null);
  // Keeps the imperative Maps event listeners (registered once, on mount)
  // reading the latest onChange without re-registering them every render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "no-key">("loading");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setStatus("no-key");
      return;
    }
    if (!mapDivRef.current) return;

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((g) => {
        if (cancelled || !mapDivRef.current) return;

        const center = lat !== undefined && lng !== undefined ? { lat, lng } : DEFAULT_CENTER;
        const map = new g.maps.Map(mapDivRef.current, {
          center,
          zoom: lat !== undefined ? 15 : 6,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        const marker = new g.maps.Marker({ position: center, map, draggable: true });

        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (pos) onChangeRef.current(pos.lat(), pos.lng());
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          marker.setPosition(e.latLng);
          onChangeRef.current(e.latLng.lat(), e.latLng.lng());
        });

        mapObj.current = map;
        markerObj.current = marker;
        geocoderObj.current = new g.maps.Geocoder();
        setStatus("ready");
      })
      .catch(() => setStatus("error"));

    return () => {
      cancelled = true;
    };
    // Deliberately mount-only: lat/lng here only seed the initial center —
    // subsequent point changes flow through geocode()/marker drag, not props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useImperativeHandle(
    ref,
    () => ({
      geocode(address: string) {
        if (!address.trim() || !geocoderObj.current || !mapObj.current || !markerObj.current) {
          return;
        }
        geocoderObj.current.geocode({ address }, (results, geocodeStatus) => {
          if (geocodeStatus === "OK" && results?.[0]) {
            const location = results[0].geometry.location;
            mapObj.current?.setCenter(location);
            mapObj.current?.setZoom(15);
            markerObj.current?.setPosition(location);
            onChangeRef.current(location.lat(), location.lng());
          }
        });
      },
    }),
    []
  );

  if (status === "no-key") {
    return <p className="text-xs text-muted">{t("noKey")}</p>;
  }
  if (status === "error") {
    return <p className="text-xs text-red-600">{t("error")}</p>;
  }

  return (
    <div>
      <div ref={mapDivRef} className="h-64 w-full rounded-lg border border-border" />
      {status === "ready" && <p className="mt-1.5 text-xs text-muted">{t("hint")}</p>}
    </div>
  );
});

export default GoogleMapPicker;
