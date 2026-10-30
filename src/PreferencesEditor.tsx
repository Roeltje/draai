import { useEffect, useState } from "react";
import { Check, Plus, SlidersHorizontal, X } from "lucide-react";
import type { Mood, RecordItem, SelectionPreferences } from "../shared/types";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_WEATHER_THRESHOLDS,
} from "../shared/selection";
import { normalizeStyle, styleCoverage } from "./styleCoverage";
const labels: { id: Mood; name: string }[] = [
  { id: "rust", name: "Rustig" },
  { id: "warm", name: "Knus" },
  { id: "energie", name: "Energiek" },
  { id: "avontuur", name: "Avontuurlijk" },
  { id: "nostalgie", name: "Nostalgisch" },
];
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
type Rule = { name: string; moods: Mood[] };
function RuleEditor({
  kind,
  rules,
  collection,
  disabled,
  onChange,
  focusRule,
}: {
  focusRule?: string;
  kind: "Stijl" | "Genre";
  rules: Rule[];
  collection: string[];
  disabled: boolean;
  onChange: (rules: Rule[]) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  useEffect(() => {
    if (focusRule) {
      setSelected(focusRule);
      setShowAll(true);
    }
  }, [focusRule]);
  const present = new Set(collection.map((value) => value.toLocaleLowerCase()));
  const matching = rules.filter((rule) =>
    present.has(rule.name.toLocaleLowerCase()),
  );
  const noMatches = rules.length > 0 && matching.length === 0;
  const visible = showAll || noMatches ? rules : matching;
  const active = visible.find((rule) => rule.name === selected) || visible[0];
  const add = () => {
    const value = name.trim();
    if (!value) return;
    const existing = rules.find(
      (rule) => rule.name.toLocaleLowerCase() === value.toLocaleLowerCase(),
    );
    if (!existing) onChange([...rules, { name: value, moods: [] }]);
    setShowAll(true);
    setSelected(existing?.name || value);
    setName("");
  };
  return (
    <details className="preference-section" open={kind === "Stijl"}>
      <summary>
        {kind === "Stijl" ? "Stijlen" : "Genres"} &amp; stemming{" "}
        <span className="rule-count">{rules.length} verbanden</span>
      </summary>
      <p className="preference-hint">
        {kind === "Stijl"
          ? "Een stijl geeft een gerichter startpunt. Stijlverbanden gaan voor genreverbanden."
          : "Genreverbanden vullen platen aan waarvoor geen eigen sfeerlabel of passend stijlverband bestaat."}{" "}
        Een persoonlijk vertrekpunt, geen muzikaal feit. Een regel zonder
        stemmingen geeft geen gewicht.
      </p>
      {noMatches ? (
        <p className="preference-hint">
          Er zijn nog geen verbanden die aansluiten op je huidige collectie.
          Daarom tonen we alle ingestelde verbanden, zodat je ze kunt bekijken
          en aanpassen.
        </p>
      ) : (
        <label className="rule-scope">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => setShowAll(event.target.checked)}
          />{" "}
          Ook verbanden buiten mijn collectie tonen
        </label>
      )}
      {visible.length ? (
        <>
          <label className="rule-select-label" htmlFor={`rule-${kind}`}>
            {kind} om te bewerken
          </label>
          <select
            className="rule-select"
            id={`rule-${kind}`}
            disabled={disabled}
            value={active?.name || ""}
            onChange={(event) => setSelected(event.target.value)}
          >
            {visible.map((rule) => (
              <option value={rule.name} key={rule.name}>
                {rule.name}
                {!rule.moods.length ? " · uit" : ""}
              </option>
            ))}
          </select>
          {active && (
            <div className="genre-rule">
              <div>
                <strong>{active.name}</strong>
                <button
                  type="button"
                  aria-label={`Regel voor ${active.name} verwijderen`}
                  disabled={disabled}
                  onClick={() =>
                    onChange(rules.filter((rule) => rule !== active))
                  }
                >
                  <X size={16} />
                </button>
              </div>
              <MoodChoices
                label={`Stemmingen voor ${active.name}`}
                value={active.moods}
                disabled={disabled}
                onChange={(moods) =>
                  onChange(
                    rules.map((rule) =>
                      rule === active ? { ...rule, moods } : rule,
                    ),
                  )
                }
              />
            </div>
          )}
        </>
      ) : (
        <p className="preference-hint">
          {rules.length
            ? "Geen verbanden voor je huidige collectie. Toon alle verbanden of voeg er zelf een toe."
            : "Geen verbanden ingesteld. Je eigen plaatlabels blijven werken."}
        </p>
      )}
      <div className="add-genre">
        <input
          aria-label={`${kind} voor een nieuwe regel`}
          list={`collection-${kind}`}
          placeholder={`Kies of typ een ${kind.toLocaleLowerCase()}`}
          value={name}
          disabled={disabled}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <datalist id={`collection-${kind}`}>
          {collection.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <button type="button" disabled={disabled || !name.trim()} onClick={add}>
          <Plus size={15} /> Toevoegen
        </button>
      </div>
    </details>
  );
}
export function PreferencesEditor({
  preferences,
  records,
  genres,
  styles,
  disabled,
  onSave,
}: {
  preferences?: SelectionPreferences;
  records: RecordItem[];
  genres: string[];
  styles: string[];
  disabled: boolean;
  onSave: (value: SelectionPreferences) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<SelectionPreferences>(
      preferences || DEFAULT_PREFERENCES,
    ),
    [dirty, setDirty] = useState(false),
    [saved, setSaved] = useState(false);
  const effective =
    preferences?.weatherThresholds || DEFAULT_WEATHER_THRESHOLDS;
  const [coldBelow, setColdBelow] = useState(String(effective.coldBelow));
  const [warmFrom, setWarmFrom] = useState(String(effective.warmFrom));
  const [thresholdDirty, setThresholdDirty] = useState(false);
  const [focusStyle, setFocusStyle] = useState("");
  const [otherStyle, setOtherStyle] = useState("");
  const coverage = styleCoverage(records, draft.styleMoods);
  const unmapped = coverage.styles.filter(
    (style) => style.status === "unmapped",
  );
  const cold = coldBelow.trim() === "" ? NaN : Number(coldBelow);
  const warm = warmFrom.trim() === "" ? NaN : Number(warmFrom);
  const thresholdValid =
    Number.isFinite(cold) &&
    Number.isFinite(warm) &&
    cold >= -40 &&
    cold <= 50 &&
    warm >= -40 &&
    warm <= 50 &&
    cold < warm;
  const source = JSON.stringify(preferences || DEFAULT_PREFERENCES);
  useEffect(() => {
    if (!dirty) {
      const next = JSON.parse(source) as SelectionPreferences;
      setDraft(next);
      setColdBelow(
        String(
          (next.weatherThresholds || DEFAULT_WEATHER_THRESHOLDS).coldBelow,
        ),
      );
      setWarmFrom(
        String((next.weatherThresholds || DEFAULT_WEATHER_THRESHOLDS).warmFrom),
      );
      setThresholdDirty(false);
    }
  }, [source, dirty]);
  const change = (next: SelectionPreferences) => {
    setDraft(next);
    setDirty(true);
    setSaved(false);
  };
  const createStyle = (name: string) => {
    if (!name) return;
    if (
      !(draft.styleMoods || []).some(
        (rule) => normalizeStyle(rule.style) === normalizeStyle(name),
      )
    ) {
      change({
        ...draft,
        styleMoods: [...(draft.styleMoods || []), { style: name, moods: [] }],
      });
    }
    setFocusStyle(name);
  };
  return (
    <section className="settings-block preference-settings">
      <div className="settings-block-head">
        <SlidersHorizontal size={23} />
        <h2>Jouw smaak, jouw regels</h2>
      </div>
      <p>
        Je eigen sfeerlabels tellen eerst, daarna stijlverbanden en dan
        genreverbanden. Draai begint met bewerkbare standaardverbanden. Pas ze
        aan jouw smaak aan; op de startpagina kies je of ze meedoen. Bestaande
        voorkeuren blijven behouden.
      </p>
      <div className="style-coverage">
        <h3>Stijlen in je platenkast</h3>
        <p className="preference-hint">
          {coverage.totalRecords} beschikbare LP’s met actuele
          collectiegegevens. {coverage.missingStyles} daarvan zonder
          stijlinformatie. Stijlen kunnen nog ontbreken zolang persingsdetails
          niet zijn opgehaald; dit overzicht beoordeelt alleen de nu bekende
          stijlen. Eigen plaatlabels gaan altijd voor.
        </p>
        {coverage.styles.length ? (
          <>
            <div className="coverage-counts">
              <span>
                <strong>
                  {
                    coverage.styles.filter((style) => style.status === "mapped")
                      .length
                  }
                </strong>{" "}
                met stemming
              </span>
              <span>
                <strong>
                  {
                    coverage.styles.filter((style) => style.status === "off")
                      .length
                  }
                </strong>{" "}
                bewust uit
              </span>
              <span>
                <strong>{unmapped.length}</strong> zonder verband
              </span>
            </div>
            <details>
              <summary>Bekijk stijlen en aantallen</summary>
              <ul className="coverage-list">
                {coverage.styles.slice(0, 5).map((style) => (
                  <li key={style.name}>
                    <span>
                      {style.name}
                      <small>
                        {style.count} LP’s ·{" "}
                        {style.status === "mapped"
                          ? "met stemming"
                          : style.status === "off"
                            ? "bewust uit"
                            : "zonder verband"}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
              {coverage.styles.length > 5 && (
                <p className="preference-hint">
                  De vijf meest voorkomende stijlen staan hierboven. Bekijk de
                  overige stijlen in de keuzelijst hieronder.
                </p>
              )}
              <select
                className="rule-select"
                aria-label="Alle bekende stijlen en aantallen"
                defaultValue=""
              >
                <option value="" disabled>
                  Alle {coverage.styles.length} stijlen en aantallen
                </option>
                {coverage.styles.map((style) => (
                  <option key={style.name}>
                    {style.name} · {style.count} LP’s ·{" "}
                    {style.status === "mapped"
                      ? "met stemming"
                      : style.status === "off"
                        ? "bewust uit"
                        : "zonder verband"}
                  </option>
                ))}
              </select>
            </details>
            {!!unmapped.length && (
              <>
                <h4>Nog zonder stijlverband</h4>
                <p className="preference-hint">
                  Meest voorkomende eerst. Voeg een conceptregel toe en kies
                  daarna de stemmingen die jij erbij vindt passen.
                </p>
                <ul className="coverage-list">
                  {unmapped.slice(0, 5).map((style) => (
                    <li key={style.name}>
                      <span>
                        {style.name}
                        <small>{style.count} LP’s</small>
                      </span>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => createStyle(style.name)}
                      >
                        <Plus size={14} /> Regel maken
                      </button>
                    </li>
                  ))}
                </ul>
                {unmapped.length > 5 && (
                  <div className="coverage-more">
                    <select
                      className="rule-select"
                      aria-label="Overige stijlen zonder verband"
                      value={otherStyle}
                      onChange={(event) => setOtherStyle(event.target.value)}
                    >
                      <option value="">
                        Kies uit alle {unmapped.length} stijlen zonder verband
                      </option>
                      {unmapped.map((style) => (
                        <option key={style.name} value={style.name}>
                          {style.name} · {style.count} LP’s
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={disabled || !otherStyle}
                      onClick={() => {
                        createStyle(otherStyle);
                        setOtherStyle("");
                      }}
                    >
                      <Plus size={14} /> Regel maken
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <p className="preference-hint">
            {coverage.totalRecords
              ? "Voor deze LP’s zijn nog geen stijlen bekend. Je kunt hieronder alvast een eigen verband maken."
              : "Er zijn nu geen beschikbare LP’s met actuele collectiegegevens om stijlen te tellen."}
          </p>
        )}
      </div>
      <RuleEditor
        kind="Stijl"
        focusRule={focusStyle}
        collection={styles}
        rules={(draft.styleMoods || []).map((rule) => ({
          name: rule.style,
          moods: rule.moods,
        }))}
        disabled={disabled}
        onChange={(rules) =>
          change({
            ...draft,
            styleMoods: rules.map((rule) => ({
              style: rule.name,
              moods: rule.moods,
            })),
          })
        }
      />
      <RuleEditor
        kind="Genre"
        collection={genres}
        rules={draft.genreMoods.map((rule) => ({
          name: rule.genre,
          moods: rule.moods,
        }))}
        disabled={disabled}
        onChange={(rules) =>
          change({
            ...draft,
            genreMoods: rules.map((rule) => ({
              genre: rule.name,
              moods: rule.moods,
            })),
          })
        }
      />
      <div className="rule-reset">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            change({
              ...draft,
              styleMoods: structuredClone(DEFAULT_PREFERENCES.styleMoods || []),
              genreMoods: structuredClone(DEFAULT_PREFERENCES.genreMoods),
            })
          }
        >
          <SlidersHorizontal size={14} /> Standaard stijl- en genreverbanden in
          concept zetten
        </button>
        <p className="preference-hint">
          Vervangt je stijl- en genreaanpassingen alleen in dit concept. Pas na
          ‘Voorkeuren bewaren’ worden ze opgeslagen. Je weerverbanden blijven
          behouden.
        </p>
      </div>
      <details className="preference-section">
        <summary>Weer &amp; stemming</summary>
        <p className="preference-hint">
          Geef zelf aan welke sfeer past bij regen, kou of warmte. Zonder jouw
          verbanden krijgt het weer geen gewicht. Regen: meer dan 0 mm/uur.
          Alleen een meting van maximaal 30 minuten oud doet mee.
        </p>
        <div className="weather-thresholds">
          <label>
            Koud bij minder dan (°C)
            <input
              type="number"
              min={-40}
              max={50}
              step="any"
              value={coldBelow}
              disabled={disabled}
              aria-invalid={!thresholdValid}
              onChange={(event) => {
                setColdBelow(event.target.value);
                setThresholdDirty(true);
                setDirty(true);
                setSaved(false);
              }}
            />
          </label>
          <label>
            Warm vanaf (°C)
            <input
              type="number"
              min={-40}
              max={50}
              step="any"
              value={warmFrom}
              disabled={disabled}
              aria-invalid={!thresholdValid}
              onChange={(event) => {
                setWarmFrom(event.target.value);
                setThresholdDirty(true);
                setDirty(true);
                setSaved(false);
              }}
            />
          </label>
        </div>
        <p className="preference-hint" role="status">
          {thresholdValid
            ? `Kou telt onder ${cold.toLocaleString("nl-NL")} °C; warmte vanaf ${warm.toLocaleString("nl-NL")} °C. Daartussen krijgt temperatuur geen gewicht.`
            : "Vul twee temperaturen tussen −40 en 50 °C in. De koudegrens moet lager zijn dan de warmtegrens."}
        </p>
        <button
          className="threshold-reset"
          type="button"
          disabled={disabled}
          onClick={() => {
            setColdBelow(String(DEFAULT_WEATHER_THRESHOLDS.coldBelow));
            setWarmFrom(String(DEFAULT_WEATHER_THRESHOLDS.warmFrom));
            setThresholdDirty(true);
            setDirty(true);
            setSaved(false);
          }}
        >
          Alleen temperatuurgrenzen terugzetten naar 10 en 22 °C (concept)
        </button>
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
          disabled={disabled || !dirty || !thresholdValid}
          onClick={async () => {
            if (
              thresholdValid &&
              (await onSave(
                thresholdDirty
                  ? {
                      ...draft,
                      weatherThresholds: { coldBelow: cold, warmFrom: warm },
                    }
                  : draft,
              ))
            ) {
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
