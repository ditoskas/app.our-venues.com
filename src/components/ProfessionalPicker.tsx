"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";

export interface ProfessionalOption {
  _id: string;
  companyName: string;
}

export default function ProfessionalPicker({
  professionals,
  defaultValue,
  name = "professionalId",
}: {
  professionals: ProfessionalOption[];
  defaultValue?: string;
  name?: string;
}) {
  const t = useTranslations("celebrations.form");
  const listId = useId();
  const initial = professionals.find((p) => p._id === defaultValue);
  const [query, setQuery] = useState(initial?.companyName ?? "");
  const [selectedId, setSelectedId] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);

  const filtered = professionals
    .filter((p) => p.companyName.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 20);

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selectedId} />
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        placeholder={t("professionalPlaceholder")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="input"
      />
      {open && filtered.length > 0 && (
        <ul
          id={listId}
          className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          {filtered.map((p) => (
            <li key={p._id}>
              <button
                type="button"
                onMouseDown={() => {
                  setQuery(p.companyName);
                  setSelectedId(p._id);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent-soft/40"
              >
                {p.companyName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
