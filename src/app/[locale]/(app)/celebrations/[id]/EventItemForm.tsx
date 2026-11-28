"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import GoogleMapPicker, { type GoogleMapPickerHandle } from "./GoogleMapPicker";
import LocalizedField from "./LocalizedField";
import type { LocalizedText } from "@/lib/celebrations";
import type { AppLocale } from "@/i18n/routing";

interface EventItemFormState {
  error?: string;
}

export interface SerializedEventItem {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  area?: string;
  date?: string;
  city?: string;
  address?: string;
  postCode?: string;
  country?: string;
  mapLat?: number;
  mapLng?: number;
  hasSeating?: boolean;
}

export default function EventItemForm({
  action,
  mode,
  initialItem,
  activeLanguages,
}: {
  action: (
    prevState: EventItemFormState,
    formData: FormData
  ) => Promise<EventItemFormState>;
  mode: "create" | "edit";
  initialItem?: SerializedEventItem;
  activeLanguages: AppLocale[];
}) {
  const t = useTranslations("celebrations.events.form");
  const [state, formAction, isPending] = useActionState(action, {});

  const [address, setAddress] = useState(initialItem?.address ?? "");
  const [city, setCity] = useState(initialItem?.city ?? "");
  const [postCode, setPostCode] = useState(initialItem?.postCode ?? "");
  const [country, setCountry] = useState(initialItem?.country ?? "");
  const [mapLat, setMapLat] = useState<number | undefined>(initialItem?.mapLat);
  const [mapLng, setMapLng] = useState<number | undefined>(initialItem?.mapLng);

  const mapRef = useRef<GoogleMapPickerHandle>(null);

  const geocodeFromAddressFields = () => {
    const query = [address, city, postCode, country].filter(Boolean).join(", ");
    mapRef.current?.geocode(query);
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <LocalizedField
        name="title"
        label={t("title")}
        required
        defaultValue={initialItem?.title}
        activeLanguages={activeLanguages}
      />

      <LocalizedField
        name="description"
        label={t("description")}
        multiline
        rows={3}
        defaultValue={initialItem?.description}
        activeLanguages={activeLanguages}
      />

      <Field label={t("date")}>
        <input
          type="date"
          name="date"
          defaultValue={initialItem?.date}
          className="input"
        />
      </Field>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-1 text-xs font-medium tracking-wide text-accent-dark uppercase">
          {t("location")}
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={t("country")}>
            <input
              name="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              onBlur={geocodeFromAddressFields}
              className="input"
            />
          </Field>
          <Field label={t("city")}>
            <input
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onBlur={geocodeFromAddressFields}
              className="input"
            />
          </Field>
          <Field label={t("area")}>
            <input name="area" defaultValue={initialItem?.area} className="input" />
          </Field>
          <Field label={t("address")}>
            <input
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={geocodeFromAddressFields}
              className="input"
            />
          </Field>
          <Field label={t("postCode")}>
            <input
              name="postCode"
              value={postCode}
              onChange={(e) => setPostCode(e.target.value)}
              onBlur={geocodeFromAddressFields}
              className="input"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-1 text-xs font-medium tracking-wide text-accent-dark uppercase">
          {t("mapPoint")}
        </legend>
        <input type="hidden" name="mapLat" value={mapLat ?? ""} />
        <input type="hidden" name="mapLng" value={mapLng ?? ""} />
        <GoogleMapPicker
          ref={mapRef}
          lat={initialItem?.mapLat}
          lng={initialItem?.mapLng}
          onChange={(lat, lng) => {
            setMapLat(lat);
            setMapLng(lng);
          }}
        />
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="hasSeating"
          defaultChecked={initialItem?.hasSeating ?? false}
          className="h-4 w-4 rounded border-border accent-accent-dark"
        />
        {t("hasSeating")}
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent-dark px-5 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending
            ? t("saving")
            : mode === "create"
              ? t("createSubmit")
              : t("saveSubmit")}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
