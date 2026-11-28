"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

interface GuestTableAssignmentFormState {
  error?: string;
}

export interface SeatingTableOption {
  id: string;
  code: string;
  maxPeople?: number;
  reserved: number;
}

// One seating-enabled event this celebration has, with the table-type
// elements off its seatingLayout (placeholders excluded — see
// lib/celebrations.ts's SeatingLayoutElement) resolved to a pickable option
// with its live reserved/max occupancy (see getTableReservedSeats()).
export interface SeatingEventOption {
  id: string;
  title: string;
  tables: SeatingTableOption[];
}

export default function AssignGuestTableForm({
  action,
  events,
  initialAssignments,
}: {
  action: (
    prevState: GuestTableAssignmentFormState,
    formData: FormData
  ) => Promise<GuestTableAssignmentFormState>;
  events: SeatingEventOption[];
  initialAssignments: { eventId: string; tableId: string }[];
}) {
  const t = useTranslations("celebrations.guests.assignTable");
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {events.map((event) => {
        const current = initialAssignments.find((a) => a.eventId === event.id)?.tableId ?? "";
        return (
          <Field key={event.id} label={event.title}>
            <select name={`table.${event.id}`} defaultValue={current} className="input">
              <option value="">{t("noTable")}</option>
              {event.tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.maxPeople != null
                    ? t("tableOption", {
                        code: table.code,
                        reserved: table.reserved,
                        max: table.maxPeople,
                      })
                    : t("tableOptionNoMax", { code: table.code, reserved: table.reserved })}
                </option>
              ))}
            </select>
          </Field>
        );
      })}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent-dark px-5 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}
