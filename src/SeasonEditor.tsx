import { Check, RotateCcw } from "lucide-react";
import type { RecordItem, Season } from "../shared/types";
import { recordSeasons } from "../shared/selection";
const seasons: { id: Season; label: string }[] = [
  { id: "lente", label: "Lente" },
  { id: "zomer", label: "Zomer" },
  { id: "herfst", label: "Herfst" },
  { id: "winter", label: "Winter" },
  { id: "kerst", label: "Kerst" },
];
export function SeasonEditor({
  record,
  disabled,
  onChange,
}: {
  record: RecordItem;
  disabled: boolean;
  onChange: (value: Season[] | null) => void;
}) {
  const value = record.seasons;
  const inferred = recordSeasons(record).inferred;
  return (
    <div className="season-editor">
      <span className="eyebrow">WANNEER PAST DEZE PLAAT?</span>
      <div
        className="edit-tags season-tags"
        role="group"
        aria-label={`Seizoenen voor ${record.title}`}
      >
        <button
          type="button"
          disabled={disabled}
          aria-pressed={Array.isArray(value) && value.length === 0}
          className={
            Array.isArray(value) && value.length === 0 ? "selected" : ""
          }
          onClick={() => onChange([])}
        >
          Hele jaar
          {Array.isArray(value) && value.length === 0 && <Check size={11} />}
        </button>
        {seasons.map((season) => (
          <button
            type="button"
            key={season.id}
            disabled={disabled}
            aria-pressed={value?.includes(season.id) || false}
            className={value?.includes(season.id) ? "selected" : ""}
            onClick={() =>
              onChange(
                value?.includes(season.id)
                  ? value.filter((s) => s !== season.id)
                  : [...(value || []), season.id],
              )
            }
          >
            {season.label}
            {value?.includes(season.id) && <Check size={11} />}
          </button>
        ))}
      </div>
      <p>
        {value === undefined
          ? inferred
            ? "Automatisch herkend als kerstplaat op basis van de titel of stijl. Kies ‘Hele jaar’ om dit voor deze plaat te veranderen."
            : "Automatisch: geen duidelijke kerstvermelding herkend. Deze plaat past het hele jaar."
          : value.length === 0
            ? "Jouw keuze: het hele jaar, ook als de titel naar kerst verwijst."
            : "Jouw keuze: iets meer kans in deze seizoenen. Kerstplaten doen bij willekeurig kiezen alleen mee van 15 november tot en met 6 januari."}
      </p>
      {value !== undefined && (
        <button
          type="button"
          className="season-reset"
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          <RotateCcw size={12} /> Terug naar automatisch
        </button>
      )}
    </div>
  );
}
