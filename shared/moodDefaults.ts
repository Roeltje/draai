import type { SelectionPreferences } from "./types.ts";

// Adapted from docs/voorstellen/draai-mapping.concept.json: existing moods at >= 0.5.
// Mood arrays are editable suggestions; concept weights and metadata are not used.
export const DEFAULT_GENRE_MOODS: SelectionPreferences["genreMoods"] = [
  {
    genre: "Blues",
    moods: ["warm", "nostalgie"],
  },
  {
    genre: "Children's",
    moods: ["nostalgie"],
  },
  {
    genre: "Classical",
    moods: ["rust"],
  },
  {
    genre: "Electronic",
    moods: ["energie", "avontuur"],
  },
  {
    genre: "Folk, World, & Country",
    moods: ["rust", "warm", "nostalgie"],
  },
  {
    genre: "Funk / Soul",
    moods: ["warm", "energie"],
  },
  {
    genre: "Hip Hop",
    moods: ["energie"],
  },
  {
    genre: "Jazz",
    moods: ["rust", "warm", "avontuur"],
  },
  {
    genre: "Latin",
    moods: ["energie", "warm"],
  },
  {
    genre: "Pop",
    moods: ["energie", "nostalgie"],
  },
  {
    genre: "Reggae",
    moods: ["warm", "rust"],
  },
  {
    genre: "Rock",
    moods: ["energie", "nostalgie"],
  },
  {
    genre: "Stage & Screen",
    moods: ["nostalgie"],
  },
];

export const DEFAULT_STYLE_MOODS: NonNullable<
  SelectionPreferences["styleMoods"]
> = [
  {
    style: "Ambient",
    moods: ["rust"],
  },
  {
    style: "Downtempo",
    moods: ["rust"],
  },
  {
    style: "Trip Hop",
    moods: ["rust"],
  },
  {
    style: "IDM",
    moods: ["avontuur"],
  },
  {
    style: "Experimental",
    moods: ["avontuur"],
  },
  {
    style: "Krautrock",
    moods: ["avontuur"],
  },
  {
    style: "Minimal",
    moods: ["rust"],
  },
  {
    style: "House",
    moods: ["energie"],
  },
  {
    style: "Deep House",
    moods: ["energie"],
  },
  {
    style: "Techno",
    moods: ["energie"],
  },
  {
    style: "Drum n Bass",
    moods: ["energie"],
  },
  {
    style: "Electro",
    moods: ["energie"],
  },
  {
    style: "Synth-pop",
    moods: ["nostalgie", "energie"],
  },
  {
    style: "New Wave",
    moods: ["nostalgie", "energie"],
  },
  {
    style: "Italo-Disco",
    moods: ["nostalgie", "energie"],
  },
  {
    style: "Disco",
    moods: ["energie"],
  },
  {
    style: "Hi NRG",
    moods: ["energie"],
  },
  {
    style: "Cool Jazz",
    moods: ["rust", "warm"],
  },
  {
    style: "Modal",
    moods: ["avontuur"],
  },
  {
    style: "Hard Bop",
    moods: ["energie", "warm"],
  },
  {
    style: "Bop",
    moods: ["energie"],
  },
  {
    style: "Soul-Jazz",
    moods: ["warm", "energie"],
  },
  {
    style: "Free Jazz",
    moods: ["avontuur"],
  },
  {
    style: "Fusion",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Jazz-Funk",
    moods: ["energie", "warm"],
  },
  {
    style: "Acid Jazz",
    moods: ["energie"],
  },
  {
    style: "Smooth Jazz",
    moods: ["rust"],
  },
  {
    style: "Swing",
    moods: ["nostalgie", "energie"],
  },
  {
    style: "Big Band",
    moods: ["nostalgie"],
  },
  {
    style: "Lounge",
    moods: ["rust", "warm"],
  },
  {
    style: "Exotica",
    moods: ["avontuur"],
  },
  {
    style: "Easy Listening",
    moods: ["rust", "nostalgie"],
  },
  {
    style: "Bossa Nova",
    moods: ["rust", "warm"],
  },
  {
    style: "Samba",
    moods: ["energie"],
  },
  {
    style: "Salsa",
    moods: ["energie"],
  },
  {
    style: "Cumbia",
    moods: ["energie"],
  },
  {
    style: "Afrobeat",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Highlife",
    moods: ["warm"],
  },
  {
    style: "Soul",
    moods: ["warm"],
  },
  {
    style: "Funk",
    moods: ["energie"],
  },
  {
    style: "Rhythm & Blues",
    moods: ["warm", "nostalgie", "energie"],
  },
  {
    style: "Gospel",
    moods: ["warm"],
  },
  {
    style: "Neo Soul",
    moods: ["warm", "rust"],
  },
  {
    style: "Northern Soul",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Psychedelic Rock",
    moods: ["avontuur"],
  },
  {
    style: "Prog Rock",
    moods: ["avontuur"],
  },
  {
    style: "Space Rock",
    moods: ["avontuur"],
  },
  {
    style: "Dream Pop",
    moods: ["rust"],
  },
  {
    style: "Hard Rock",
    moods: ["energie"],
  },
  {
    style: "Heavy Metal",
    moods: ["energie"],
  },
  {
    style: "Doom Metal",
    moods: ["avontuur"],
  },
  {
    style: "Punk",
    moods: ["energie"],
  },
  {
    style: "Hardcore",
    moods: ["energie"],
  },
  {
    style: "Post-Punk",
    moods: ["energie"],
  },
  {
    style: "Grunge",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Indie Rock",
    moods: ["energie"],
  },
  {
    style: "Indie Pop",
    moods: ["energie"],
  },
  {
    style: "Alternative Rock",
    moods: ["energie"],
  },
  {
    style: "Garage Rock",
    moods: ["energie"],
  },
  {
    style: "Classic Rock",
    moods: ["nostalgie", "energie"],
  },
  {
    style: "Blues Rock",
    moods: ["energie", "warm"],
  },
  {
    style: "Rock & Roll",
    moods: ["nostalgie", "energie"],
  },
  {
    style: "Rockabilly",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Soft Rock",
    moods: ["rust", "nostalgie"],
  },
  {
    style: "AOR",
    moods: ["nostalgie"],
  },
  {
    style: "Pop Rock",
    moods: ["nostalgie", "energie"],
  },
  {
    style: "Power Pop",
    moods: ["energie"],
  },
  {
    style: "Folk Rock",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Country Rock",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Lo-Fi",
    moods: ["rust"],
  },
  {
    style: "Folk",
    moods: ["rust", "warm"],
  },
  {
    style: "Country",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Bluegrass",
    moods: ["energie", "warm"],
  },
  {
    style: "Celtic",
    moods: ["warm"],
  },
  {
    style: "Chanson",
    moods: ["nostalgie", "warm"],
  },
  {
    style: "Ballad",
    moods: ["rust"],
  },
  {
    style: "Vocal",
    moods: ["nostalgie", "warm"],
  },
  {
    style: "Roots Reggae",
    moods: ["warm", "rust"],
  },
  {
    style: "Dub",
    moods: ["rust"],
  },
  {
    style: "Ska",
    moods: ["energie"],
  },
  {
    style: "Rocksteady",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Dancehall",
    moods: ["energie"],
  },
  {
    style: "Boom Bap",
    moods: ["nostalgie", "energie"],
  },
  {
    style: "Baroque",
    moods: ["rust"],
  },
  {
    style: "Romantic",
    moods: ["rust"],
  },
  {
    style: "Modern",
    moods: ["avontuur"],
  },
  {
    style: "Contemporary",
    moods: ["avontuur"],
  },
  {
    style: "Opera",
    moods: ["nostalgie"],
  },
  {
    style: "Soundtrack",
    moods: ["nostalgie"],
  },
  {
    style: "Musical",
    moods: ["nostalgie"],
  },
  {
    style: "Holiday",
    moods: ["nostalgie", "warm"],
  },
];
