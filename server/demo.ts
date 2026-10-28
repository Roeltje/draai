import type { RecordItem, Mood } from "../shared/types.ts";
export function demoRecords(now: string): RecordItem[] {
  const names = [
    ["Nachtlicht", "Studio Noord"],
    ["Tussen de regels", "Mira & de Rivier"],
    ["Zachte landing", "Het Getij"],
    ["Buiten bereik", "Satelliet"],
    ["Kleine uren", "Oscar Vale Trio"],
    ["Open water", "Alma Sol"],
  ];
  const tags: Mood[][] = [
    ["warm", "energie"],
    ["rust", "warm"],
    ["rust"],
    ["energie", "avontuur"],
    ["warm", "rust"],
    ["avontuur"],
  ];
  return names.map(([title, artist], i) => ({
    id: `demo-${i + 1}`,
    releaseId: 0,
    albumInfo: {
      status: "ready",
      summary: `${title} is een fictief album in de voorbeeldcollectie van Draai. Dit korte albumverhaal is speciaal als demonstratietekst geschreven en bevat geen internetfeiten over een echte artiest.`,
      wikipediaUrl: "",
      wikidataUrl: "",
      language: "nl",
      checkedAt: now,
      demo: true,
      dates:
        i === 0
          ? [
              {
                kind: "release",
                date: "2020-10-28",
                subject: title,
                sourceUrl: "",
              },
            ]
          : [],
    },
    title,
    artist,
    artistIds: [],
    year: 2020 + i,
    country: "Voorbeeld",
    label: "Draai — fictief",
    catalogNumber: `DEMO-${i + 1}`,
    formats: ["Vinyl", "LP"],
    genres: ["Voorbeeldmuziek"],
    styles: [],
    coverUrl: `/artwork/0${i + 1}.svg`,
    sourceUrl: "",
    tracks: [
      {
        position: "A1",
        title: "De eerste beweging (voorbeeld)",
        duration: "4:12",
      },
      { position: "A2", title: "Onderweg (voorbeeld)", duration: "5:08" },
      {
        position: "B1",
        title: "Een nieuw begin (voorbeeld)",
        duration: "6:20",
      },
      { position: "B2", title: "Tot straks (voorbeeld)", duration: "3:45" },
    ],
    credits: [],
    notes:
      "Fictieve voorbeeldplaat. Alle releasegegevens en tracks zijn demonstratiegegevens.",
    tags: tags[i],
    excluded: false,
    available: true,
    isLP: true,
    addedAt: now,
    fetchedAt: now,
    demo: true,
  }));
}
