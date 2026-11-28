"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Circle, Square, Tag, Trash2, Save, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { updateEventSeatingLayoutAction } from "../../../actions";
import type { SeatingLayoutElement, SeatingElementType } from "@/lib/celebrations";

const MIN_SIZE = 32;
const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 900;

// Fans new elements out a little instead of stacking every new one on
// the exact same spot — purely a starting point, the admin drags it
// wherever it actually belongs.
function nextDefaultPosition(count: number): { x: number; y: number } {
  const step = 28;
  const perRow = 8;
  return { x: 40 + (count % perRow) * step, y: 40 + (count % perRow) * step };
}

function newElement(type: SeatingElementType, count: number): SeatingLayoutElement {
  const { x, y } = nextDefaultPosition(count);
  const id = crypto.randomUUID();
  if (type === "table-circle") {
    return { id, type, x, y, width: 80, height: 80, code: `T${count + 1}`, maxPeople: 8 };
  }
  if (type === "table-rect") {
    return { id, type, x, y, width: 110, height: 60, code: `T${count + 1}`, maxPeople: 8 };
  }
  return { id, type, x, y, width: 150, height: 50, label: "Label" };
}

export default function EventSeatingLayoutEditor({
  celebrationId,
  eventId,
  eventTitle,
  initialElements,
  reservedByTableId,
}: {
  celebrationId: string;
  eventId: string;
  eventTitle: string;
  initialElements: SeatingLayoutElement[];
  reservedByTableId: Record<string, number>;
}) {
  const t = useTranslations("celebrations.events.seatingLayout");

  const [elements, setElements] = useState<SeatingLayoutElement[]>(initialElements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const selected = elements.find((el) => el.id === selectedId) ?? null;

  const addElement = (type: SeatingElementType) => {
    // Computed from the current `elements` snapshot rather than inside the
    // setElements updater below — calling another setState from within a
    // setState updater is invalid (React may invoke updaters more than
    // once, e.g. under Strict Mode, so side effects inside one aren't
    // safe) and caused exactly this: the toolbar buttons silently doing
    // nothing / the tab hanging on click.
    const el = newElement(type, elements.length);
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
    setDirty(true);
    setJustSaved(false);
  };

  const updateElement = useCallback((updated: SeatingLayoutElement) => {
    setElements((prev) => prev.map((el) => (el.id === updated.id ? updated : el)));
    setDirty(true);
    setJustSaved(false);
  }, []);

  const deleteSelected = () => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
    setDirty(true);
    setJustSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const result = await updateEventSeatingLayoutAction(celebrationId, eventId, elements);
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
    } else {
      setDirty(false);
      setJustSaved(true);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/celebrations/${celebrationId}/events`}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent-dark"
          >
            <ArrowLeft size={14} />
            {t("back")}
          </Link>
          <h2 className="font-serif text-2xl text-foreground">
            {t("pageTitle")} — {eventTitle}
          </h2>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent-dark px-4 py-2 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? t("saving") : t("save")}
        </button>
      </div>

      {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      {!dirty && justSaved && <p className="text-sm text-emerald-700">{t("saved")}</p>}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3">
        <ToolButton icon={Circle} label={t("addRoundTable")} onClick={() => addElement("table-circle")} />
        <ToolButton icon={Square} label={t("addRectTable")} onClick={() => addElement("table-rect")} />
        <ToolButton icon={Tag} label={t("addPlaceholder")} onClick={() => addElement("placeholder")} />

        {selected && (
          <button
            type="button"
            onClick={deleteSelected}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 size={14} />
            {t("deleteElement")}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div
          className="relative flex-1 overflow-auto rounded-lg border border-border"
          style={{
            height: "70vh",
            backgroundImage: "radial-gradient(circle, #e7dfd2 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          onPointerDown={() => setSelectedId(null)}
        >
          <div className="relative" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            {elements.length === 0 && (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted">
                {t("empty")}
              </p>
            )}
            {elements.map((el) => (
              <SeatingElementView
                key={el.id}
                element={el}
                selected={el.id === selectedId}
                reserved={reservedByTableId[el.id] ?? 0}
                onSelect={() => setSelectedId(el.id)}
                onChange={updateElement}
              />
            ))}
          </div>
        </div>

        <div className="w-full shrink-0 rounded-lg border border-border bg-surface p-4 lg:w-64">
          <h3 className="mb-3 text-xs font-medium tracking-wide text-accent-dark uppercase">
            {t("properties")}
          </h3>
          {!selected ? (
            <p className="text-sm text-muted">{t("noSelection")}</p>
          ) : selected.type === "placeholder" ? (
            <Field label={t("label")}>
              <input
                className="input"
                value={selected.label ?? ""}
                onChange={(e) => updateElement({ ...selected, label: e.target.value })}
              />
            </Field>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label={t("code")}>
                <input
                  className="input"
                  value={selected.code ?? ""}
                  onChange={(e) => updateElement({ ...selected, code: e.target.value })}
                />
              </Field>
              <Field label={t("maxPeople")}>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={selected.maxPeople ?? ""}
                  onChange={(e) =>
                    updateElement({
                      ...selected,
                      maxPeople: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label={t("reserved")}>
                <input
                  type="text"
                  readOnly
                  disabled
                  className="input bg-accent-soft/10 text-muted"
                  value={reservedByTableId[selected.id] ?? 0}
                />
              </Field>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Circle;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent-dark hover:text-accent-dark"
    >
      <Icon size={14} />
      {label}
    </button>
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

// Drag (pointerdown/move/up on the element body) and resize (same, but on
// the small bottom-right handle, which stops propagation so it doesn't
// also start a drag) implemented with plain Pointer Events + setPointerCapture
// — no drag/resize library. Position/size updates flow straight into the
// parent's `elements` state via onChange on every pointermove, same as any
// other controlled input in this app.
function SeatingElementView({
  element,
  selected,
  reserved,
  onSelect,
  onChange,
}: {
  element: SeatingLayoutElement;
  selected: boolean;
  reserved: number;
  onSelect: () => void;
  onChange: (element: SeatingLayoutElement) => void;
}) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onSelect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: element.x, origY: element.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onChange({
        ...element,
        x: Math.max(0, dragRef.current.origX + dx),
        y: Math.max(0, dragRef.current.origY + dy),
      });
    } else if (resizeRef.current) {
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;
      onChange({
        ...element,
        width: Math.max(MIN_SIZE, resizeRef.current.origW + dx),
        height: Math.max(MIN_SIZE, resizeRef.current.origH + dy),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    resizeRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: element.width, origH: element.height };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const isPlaceholder = element.type === "placeholder";
  const isCircle = element.type === "table-circle";

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ left: element.x, top: element.y, width: element.width, height: element.height }}
      className={`absolute flex touch-none cursor-move items-center justify-center border-2 text-center select-none ${
        isCircle ? "rounded-full" : "rounded-md"
      } ${
        isPlaceholder
          ? "border-dashed border-muted bg-surface"
          : "border-accent-dark/60 bg-accent-soft/40"
      } ${selected ? "ring-2 ring-accent-dark ring-offset-2" : ""}`}
    >
      <span className="pointer-events-none px-1 text-xs leading-tight font-medium text-foreground">
        {isPlaceholder ? (
          element.label || "—"
        ) : (
          <>
            {element.code || "—"}
            <br />
            <span
              className={`text-[10px] font-normal ${
                element.maxPeople != null && reserved > element.maxPeople
                  ? "text-red-600"
                  : "text-muted"
              }`}
            >
              {reserved}
              {element.maxPeople != null ? `/${element.maxPeople}` : ""}
            </span>
          </>
        )}
      </span>

      <div
        onPointerDown={handleResizePointerDown}
        title="resize"
        className="absolute right-0 bottom-0 h-3.5 w-3.5 translate-x-1/2 translate-y-1/2 cursor-se-resize touch-none rounded-sm border border-white bg-accent-dark"
      />
    </div>
  );
}
