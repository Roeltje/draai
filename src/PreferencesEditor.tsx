import { useEffect, useState } from "react";
import { Check, Plus, SlidersHorizontal, X } from "lucide-react";
import type { Mood, SelectionPreferences } from "../shared/types";
const labels: { id: Mood; name: string }[] = [
  { id: "rust", name: "Rustig" },
  { id: "warm", name: "Warm" },
  { id: "energie", name: "Energiek" },
  { id: "avontuur", name: "Avontuurlijk" },
  { id: "nostalgie", name: "Nostalgisch" },
];
const empty: SelectionPreferences = {
  genreMoods: [],
  weatherMoods: { rain: [], cold: [], warm: [] },
};
function MoodChoices({
  value,
  onChange,
  label,
  disabled,
}: {
  value: Mood[];
  onChange: (value: Mood[]) => void;
  label: string;
  disabled: boolean;
}) {
  return (
    <div className="preference-moods" role="group" aria-label={label}>
      {labels.map((mood) => (
        <button
          type="button"
          key={mood.id}
          aria-pressed={value.includes(mood.id)}
          disabled={disabled}
          className={value.includes(mood.id) ? "selected" : ""}
          onClick={() =>
            onChange(
              value.includes(mood.id)
                ? value.filter((m) => m !== mood.id)
                : [...value, mood.id],
            )
          }
        >
          {mood.name}
          {value.includes(mood.id) && <Check size={11} />}
        </button>
      ))}
    </div>
  );
}
export function PreferencesEditor({
  preferences,
  genres,
  disabled,
  onSave,
}: {
  preferences?: SelectionPreferences;
  genres: string[];
  disabled: boolean;
  onSave: (value: SelectionPreferences) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<SelectionPreferences>(
      preferences || empty,
    ),
    [dirty, setDirty] = useState(false),
    [genre, setGenre] = useState(""),
    [saved, setSaved] = useState(false);
  const source = JSON.stringify(preferences || empty);
  useEffect(() => {
    if (!dirty) setDraft(JSON.parse(source) as SelectionPreferences);
  }, [source, dirty]);
  const change = (next: SelectionPreferences) => {
    setDraft(next);
    setDirty(true);
    setSaved(false);
  };
  const addGenre = () => {
    const name = genre.trim();
    if (
      !name ||
      draft.genreMoods.some(
        (rule) => rule.genre.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    )
      return;
    change({
      ...draft,
      genreMoods: [...draft.genreMoods, { genre: name, moods: [] }],
    });
    setGenre("");
  };
  return (
    <section className="settings-block preference-settings">
      <div className="settings-block-head">
        <SlidersHorizontal size={23} />
        <h2>Jouw smaak, jouw regels</h2>
      </div>
      <p>
        Je eigen sfeerlabels tellen eerst. Met deze voorkeuren kun je daarnaast
        genres en gemeten weer koppelen aan een stemming. Je kiest op de
        startpagina of deze verbanden meedoen.
      </p>
      <details className="preference-section" open>
        <summary>Genres &amp; stemming</summary>
        <p className="preference-hint">
          Een persoonlijk verband, geen muzikaal feit. Genreregels vullen alleen
          platen zonder eigen sfeerlabels aan. Kies bijvoorbeeld welke genres
          voor jou nostalgisch klinken.
        </p>
        {draft.genreMoods.map((rule, index) => (
          <div className="genre-rule" key={rule.genre}>
            <div>
              <strong>{rule.genre}</strong>
              <button
                type="button"
                aria-label={`Regel voor ${rule.genre} verwijderen`}
                disabled={disabled}
                onClick={() =>
                  change({
                    ...draft,
                    genreMoods: draft.genreMoods.filter((_, i) => i !== index),
                  })
                }
              >
                <X size={16} />
              </button>
            </div>
            <MoodChoices
              label={`Stemmingen voor ${rule.genre}`}
              value={rule.moods}
              disabled={disabled}
              onChange={(moods) =>
                change({
                  ...draft,
                  genreMoods: draft.genreMoods.map((r, i) =>
                    i === index ? { ...r, moods } : r,
                  ),
                })
              }
            />
          </div>
        ))}
        <div className="add-genre">
          <input
            aria-label="Genre voor een nieuwe regel"
            list="collection-genres"
            placeholder="Kies of typ een genre"
            value={genre}
            disabled={disabled}
            maxLength={80}
            onChange={(event) => setGenre(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addGenre();
              }
            }}
          />
          <datalist id="collection-genres">
            {genres.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <button
            type="button"
            disabled={disabled || !genre.trim()}
            onClick={addGenre}
          >
            <Plus size={15} /> Toevoegen
          </button>
        </div>
        {!draft.genreMoods.length && (
          <p className="preference-hint">
            Nog geen genreregels. Je persoonlijke plaatlabels blijven gewoon
            werken.
          </p>
        )}
      </details>
      <details className="preference-section">
        <summary>Weer &amp; stemming</summary>
        <p className="preference-hint">
          Regen betekent niet automatisch jazz. Geef zelf aan welke sfeer past
          bij regen, kou of warmte. Zonder jouw verbanden krijgt het weer geen
          gewicht. Regen: meer dan 0 mm/uur, kou: onder 10 °C, warmte: vanaf 22
          °C. Alleen een meting van maximaal 30 minuten oud doet mee.
        </p>
        {(
          [
            { id: "rain", label: "Bij regen" },
            { id: "cold", label: "Bij kou" },
            { id: "warm", label: "Bij warmte" },
          ] as const
        ).map((condition) => (
          <div className="weather-rule" key={condition.id}>
            <strong>{condition.label}</strong>
            <MoodChoices
              label={`Stemmingen ${condition.label.toLocaleLowerCase()}`}
              value={draft.weatherMoods[condition.id]}
              disabled={disabled}
              onChange={(moods) =>
                change({
                  ...draft,
                  weatherMoods: {
                    ...draft.weatherMoods,
                    [condition.id]: moods,
                  },
                })
              }
            />
          </div>
        ))}
      </details>
      <div className="preference-save">
        <button
          type="button"
          className="button secondary"
          disabled={disabled || !dirty}
          onClick={async () => {
            if (await onSave(draft)) {
              setDirty(false);
              setSaved(true);
            }
          }}
        >
          Voorkeuren bewaren <Check size={16} />
        </button>
        <span role="status">
          {saved
            ? "Je voorkeuren zijn bewaard."
            : dirty
              ? "Je wijzigingen zijn nog niet bewaard."
              : ""}
        </span>
      </div>
    </section>
  );
}
