import type { SelectionPreferences } from "./types.ts";

// Second batch of default style moods, added on top of the concept-derived
// preset. Covers the remaining Discogs styles; editable suggestions.
export const ADDED_STYLE_MOODS: NonNullable<
  SelectionPreferences["styleMoods"]
> = [
  // Blues
  {
    style: "Blues",
    moods: ["warm"],
  },
  {
    style: "Boogie Woogie",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Chicago Blues",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Country Blues",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Delta Blues",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Electric Blues",
    moods: ["warm", "energie"],
  },
  {
    style: "Gospel Blues",
    moods: ["warm"],
  },
  {
    style: "Harmonica Blues",
    moods: ["warm"],
  },
  {
    style: "Hill Country Blues",
    moods: ["warm"],
  },
  {
    style: "Jump Blues",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Louisiana Blues",
    moods: ["warm"],
  },
  {
    style: "Memphis Blues",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Modern Electric Blues",
    moods: ["warm", "energie"],
  },
  {
    style: "Piano Blues",
    moods: ["warm", "rust"],
  },
  {
    style: "Piedmont Blues",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Swamp Blues",
    moods: ["warm", "avontuur"],
  },
  {
    style: "Texas Blues",
    moods: ["warm", "energie"],
  },
  // Brass & Military
  {
    style: "Brass Band",
    moods: ["nostalgie"],
  },
  {
    style: "Fanfare",
    moods: ["nostalgie", "energie"],
  },
  {
    style: "Marches",
    moods: ["nostalgie"],
  },
  {
    style: "Military",
    moods: ["nostalgie"],
  },
  {
    style: "Pipe & Drum",
    moods: ["nostalgie"],
  },
  // Children's
  {
    style: "Educational",
    moods: ["nostalgie"],
  },
  {
    style: "Lullaby",
    moods: ["rust"],
  },
  {
    style: "Nursery Rhymes",
    moods: ["nostalgie"],
  },
  {
    style: "Story",
    moods: ["nostalgie"],
  },
  // Classical
  {
    style: "Avant-garde",
    moods: ["avontuur"],
  },
  {
    style: "Chamber Music",
    moods: ["rust"],
  },
  {
    style: "Chant",
    moods: ["rust"],
  },
  {
    style: "Choral",
    moods: ["rust"],
  },
  {
    style: "Classical",
    moods: ["rust"],
  },
  {
    style: "Concerto",
    moods: ["rust"],
  },
  {
    style: "Contemporary Classical",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Early",
    moods: ["rust", "nostalgie"],
  },
  {
    style: "Electroacoustic",
    moods: ["avontuur"],
  },
  {
    style: "Gregorian Chant",
    moods: ["rust"],
  },
  {
    style: "Impressionist",
    moods: ["rust"],
  },
  {
    style: "Lieder",
    moods: ["rust", "warm"],
  },
  {
    style: "Medieval",
    moods: ["rust", "nostalgie"],
  },
  {
    style: "Minimalism",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Neo-Classical",
    moods: ["rust"],
  },
  {
    style: "Neo-Romantic",
    moods: ["rust", "warm"],
  },
  {
    style: "Operetta",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Orchestral",
    moods: ["rust"],
  },
  {
    style: "Plainsong",
    moods: ["rust"],
  },
  {
    style: "Post-Modern",
    moods: ["avontuur"],
  },
  {
    style: "Renaissance",
    moods: ["rust", "nostalgie"],
  },
  {
    style: "Sacred",
    moods: ["rust"],
  },
  {
    style: "Serial",
    moods: ["avontuur"],
  },
  {
    style: "Solo Piano",
    moods: ["rust"],
  },
  {
    style: "Spectral",
    moods: ["avontuur"],
  },
  {
    style: "String Quartet",
    moods: ["rust"],
  },
  {
    style: "Symphony",
    moods: ["rust"],
  },
  // Electronic
  {
    style: "Abstract",
    moods: ["avontuur"],
  },
  {
    style: "Acid",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Acid House",
    moods: ["energie"],
  },
  {
    style: "Acid Techno",
    moods: ["energie"],
  },
  {
    style: "Ambient House",
    moods: ["rust"],
  },
  {
    style: "Bass Music",
    moods: ["energie"],
  },
  {
    style: "Bassline",
    moods: ["energie"],
  },
  {
    style: "Berlin-School",
    moods: ["avontuur", "rust"],
  },
  {
    style: "Big Beat",
    moods: ["energie"],
  },
  {
    style: "Bleep",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Breakbeat",
    moods: ["energie"],
  },
  {
    style: "Breakcore",
    moods: ["energie"],
  },
  {
    style: "Breaks",
    moods: ["energie"],
  },
  {
    style: "Broken Beat",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Chillwave",
    moods: ["rust", "nostalgie"],
  },
  {
    style: "Chiptune",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Dance-pop",
    moods: ["energie"],
  },
  {
    style: "Dark Ambient",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Dark Electro",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Darkwave",
    moods: ["avontuur"],
  },
  {
    style: "Deep Techno",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Detroit Techno",
    moods: ["energie"],
  },
  {
    style: "Doomcore",
    moods: ["energie"],
  },
  {
    style: "Dream Trance",
    moods: ["energie"],
  },
  {
    style: "Drone",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Dub Techno",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Dubstep",
    moods: ["energie"],
  },
  {
    style: "Dutch House",
    moods: ["energie"],
  },
  {
    style: "EBM",
    moods: ["energie"],
  },
  {
    style: "Electro House",
    moods: ["energie"],
  },
  {
    style: "Electro Swing",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Electroclash",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Electronic",
    moods: ["energie"],
  },
  {
    style: "Euro House",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Euro-Disco",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Eurobeat",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Eurodance",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Footwork",
    moods: ["energie"],
  },
  {
    style: "Freestyle",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Funkot",
    moods: ["energie"],
  },
  {
    style: "Future Bass",
    moods: ["energie"],
  },
  {
    style: "Future House",
    moods: ["energie"],
  },
  {
    style: "Gabber",
    moods: ["energie"],
  },
  {
    style: "Garage House",
    moods: ["energie"],
  },
  {
    style: "Ghettotech",
    moods: ["energie"],
  },
  {
    style: "Glitch",
    moods: ["avontuur"],
  },
  {
    style: "Goa Trance",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Grime",
    moods: ["energie"],
  },
  {
    style: "Halftime",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Hands Up",
    moods: ["energie"],
  },
  {
    style: "Happy Hardcore",
    moods: ["energie"],
  },
  {
    style: "Hard House",
    moods: ["energie"],
  },
  {
    style: "Hard Techno",
    moods: ["energie"],
  },
  {
    style: "Hard Trance",
    moods: ["energie"],
  },
  {
    style: "Hardcore Techno",
    moods: ["energie"],
  },
  {
    style: "Hardstyle",
    moods: ["energie"],
  },
  {
    style: "Hip-House",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Hypnagogic Pop",
    moods: ["avontuur", "nostalgie"],
  },
  {
    style: "Illbient",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Industrial",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Italo House",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Italodance",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Jazzdance",
    moods: ["energie", "warm"],
  },
  {
    style: "Juke",
    moods: ["energie"],
  },
  {
    style: "Jumpstyle",
    moods: ["energie"],
  },
  {
    style: "Jungle",
    moods: ["energie"],
  },
  {
    style: "Latin House",
    moods: ["energie", "warm"],
  },
  {
    style: "Leftfield",
    moods: ["avontuur"],
  },
  {
    style: "Makina",
    moods: ["energie"],
  },
  {
    style: "Minimal Techno",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Modern Classical",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Moombahton",
    moods: ["energie"],
  },
  {
    style: "Musique Concrète",
    moods: ["avontuur"],
  },
  {
    style: "Neo Trance",
    moods: ["energie"],
  },
  {
    style: "Neurofunk",
    moods: ["energie"],
  },
  {
    style: "New Age",
    moods: ["rust"],
  },
  {
    style: "New Beat",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Noise",
    moods: ["avontuur"],
  },
  {
    style: "Nu-Disco",
    moods: ["energie"],
  },
  {
    style: "Power Electronics",
    moods: ["avontuur"],
  },
  {
    style: "Progressive Breaks",
    moods: ["energie"],
  },
  {
    style: "Progressive House",
    moods: ["energie"],
  },
  {
    style: "Progressive Trance",
    moods: ["energie"],
  },
  {
    style: "Psy-Trance",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Rhythmic Noise",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Schranz",
    moods: ["energie"],
  },
  {
    style: "Sound Art",
    moods: ["avontuur"],
  },
  {
    style: "Sound Collage",
    moods: ["avontuur"],
  },
  {
    style: "Space Age",
    moods: ["avontuur", "nostalgie"],
  },
  {
    style: "Spacesynth",
    moods: ["avontuur", "nostalgie"],
  },
  {
    style: "Speed Garage",
    moods: ["energie"],
  },
  {
    style: "Speedcore",
    moods: ["energie"],
  },
  {
    style: "Synthwave",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Tech House",
    moods: ["energie"],
  },
  {
    style: "Tech Trance",
    moods: ["energie"],
  },
  {
    style: "Trance",
    moods: ["energie"],
  },
  {
    style: "Trap Music",
    moods: ["energie"],
  },
  {
    style: "Tribal",
    moods: ["energie"],
  },
  {
    style: "Tribal House",
    moods: ["energie"],
  },
  {
    style: "UK Funky",
    moods: ["energie"],
  },
  {
    style: "UK Garage",
    moods: ["energie"],
  },
  {
    style: "Vaporwave",
    moods: ["rust", "nostalgie"],
  },
  {
    style: "Witch House",
    moods: ["avontuur"],
  },
  {
    style: "Wonky",
    moods: ["avontuur"],
  },
  // Folk, World, & Country
  {
    style: "Aboriginal",
    moods: ["avontuur"],
  },
  {
    style: "African",
    moods: ["avontuur", "warm"],
  },
  {
    style: "Americana",
    moods: ["warm"],
  },
  {
    style: "Andean Music",
    moods: ["avontuur", "warm"],
  },
  {
    style: "Appalachian Music",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Bandari",
    moods: ["avontuur", "warm"],
  },
  {
    style: "Basque Music",
    moods: ["avontuur", "warm"],
  },
  {
    style: "Beguine",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Benga",
    moods: ["warm", "energie"],
  },
  {
    style: "Bhajan",
    moods: ["rust"],
  },
  {
    style: "Bhangra",
    moods: ["energie"],
  },
  {
    style: "Bro-Country",
    moods: ["warm"],
  },
  {
    style: "Cajun",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Calypso",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Canzone Napoletana",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Carnatic",
    moods: ["avontuur", "rust"],
  },
  {
    style: "Catalan Music",
    moods: ["warm"],
  },
  {
    style: "Chutney",
    moods: ["warm", "energie"],
  },
  {
    style: "Contemporary Country",
    moods: ["warm"],
  },
  {
    style: "Country Gospel",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Cowboy",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Cretan",
    moods: ["warm"],
  },
  {
    style: "Dabke",
    moods: ["energie"],
  },
  {
    style: "Dangdut",
    moods: ["energie"],
  },
  {
    style: "Drinking Song",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Enka",
    moods: ["nostalgie"],
  },
  {
    style: "Fado",
    moods: ["warm"],
  },
  {
    style: "Flamenco",
    moods: ["warm", "energie"],
  },
  {
    style: "Fuji",
    moods: ["energie", "warm"],
  },
  {
    style: "Gagaku",
    moods: ["avontuur", "rust"],
  },
  {
    style: "Gamelan",
    moods: ["avontuur", "rust"],
  },
  {
    style: "Ghazal",
    moods: ["rust", "warm"],
  },
  {
    style: "Gnawa",
    moods: ["avontuur", "warm"],
  },
  {
    style: "Greek Folk",
    moods: ["warm"],
  },
  {
    style: "Griot",
    moods: ["avontuur", "warm"],
  },
  {
    style: "Hawaiian",
    moods: ["rust", "warm"],
  },
  {
    style: "Hawaiian Slack-Key",
    moods: ["rust", "warm"],
  },
  {
    style: "Hillbilly",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Hindustani",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Honky Tonk",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Indian Classical",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Irish Folk",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Joik",
    moods: ["avontuur"],
  },
  {
    style: "Jug Band",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Juju",
    moods: ["energie", "warm"],
  },
  {
    style: "Kirtan",
    moods: ["rust"],
  },
  {
    style: "Klezmer",
    moods: ["warm", "avontuur"],
  },
  {
    style: "Kora",
    moods: ["rust", "warm"],
  },
  {
    style: "Kwaito",
    moods: ["energie"],
  },
  {
    style: "Laïkó",
    moods: ["warm"],
  },
  {
    style: "Levenslied",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Ländler",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Maloya",
    moods: ["warm"],
  },
  {
    style: "Mbalax",
    moods: ["energie"],
  },
  {
    style: "Mbaqanga",
    moods: ["energie", "warm"],
  },
  {
    style: "Mbira",
    moods: ["rust", "warm"],
  },
  {
    style: "Min'yō",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Morna",
    moods: ["warm"],
  },
  {
    style: "Nashville Sound",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Neofolk",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Nordic",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Old-Time",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Outlaw Country",
    moods: ["warm"],
  },
  {
    style: "Pacific",
    moods: ["rust", "warm"],
  },
  {
    style: "Palm-Wine",
    moods: ["warm"],
  },
  {
    style: "Pibroch",
    moods: ["avontuur"],
  },
  {
    style: "Polka",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Polynesian",
    moods: ["rust", "warm"],
  },
  {
    style: "Qasidah",
    moods: ["rust"],
  },
  {
    style: "Qawwali",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Raï",
    moods: ["energie", "warm"],
  },
  {
    style: "Rebetiko",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Romani",
    moods: ["energie", "warm"],
  },
  {
    style: "Sanza",
    moods: ["rust", "warm"],
  },
  {
    style: "Schlager",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Scottish Folk",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Sea Shanties",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Sephardic",
    moods: ["warm"],
  },
  {
    style: "Singer-Songwriter",
    moods: ["warm", "rust"],
  },
  {
    style: "Skiffle",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Soukous",
    moods: ["energie", "warm"],
  },
  {
    style: "Spirituals",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Square Dance",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Sámi Music",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Séga",
    moods: ["energie", "warm"],
  },
  {
    style: "Taarab",
    moods: ["warm"],
  },
  {
    style: "Tex-Mex",
    moods: ["warm", "energie"],
  },
  {
    style: "Throat Singing",
    moods: ["avontuur"],
  },
  {
    style: "Truck Driving Songs",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Turkish Folk",
    moods: ["warm"],
  },
  {
    style: "Volksmusik",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Western Swing",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Yodel",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Zouk",
    moods: ["warm", "energie"],
  },
  {
    style: "Zydeco",
    moods: ["energie", "warm"],
  },
  // Funk / Soul
  {
    style: "Blue-Eyed Soul",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Boogie",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Contemporary R&B",
    moods: ["warm"],
  },
  {
    style: "Deep Soul",
    moods: ["warm"],
  },
  {
    style: "Doo Wop",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Electro-Funk",
    moods: ["energie"],
  },
  {
    style: "Free Funk",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Go-Go",
    moods: ["energie"],
  },
  {
    style: "Gospel Soul",
    moods: ["warm"],
  },
  {
    style: "Minneapolis Sound",
    moods: ["energie", "warm"],
  },
  {
    style: "Motown",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "New Jack Swing",
    moods: ["energie"],
  },
  {
    style: "P.Funk",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Philly Soul",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Psychedelic Soul",
    moods: ["warm", "avontuur"],
  },
  {
    style: "Quiet Storm",
    moods: ["rust", "warm"],
  },
  {
    style: "Rare Groove",
    moods: ["energie", "warm"],
  },
  {
    style: "Southern Soul",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Sweet Soul",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Swingbeat",
    moods: ["energie"],
  },
  {
    style: "UK Street Soul",
    moods: ["warm"],
  },
  // Hip Hop
  {
    style: "Abstract Hip-Hop",
    moods: ["avontuur"],
  },
  {
    style: "Alternative Hip Hop",
    moods: ["avontuur"],
  },
  {
    style: "Bass",
    moods: ["energie"],
  },
  {
    style: "Beatbox",
    moods: ["energie"],
  },
  {
    style: "Bounce",
    moods: ["energie"],
  },
  {
    style: "Britcore",
    moods: ["energie"],
  },
  {
    style: "Cloud Rap",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Conscious",
    moods: ["warm"],
  },
  {
    style: "Crunk",
    moods: ["energie"],
  },
  {
    style: "Cut-up/DJ",
    moods: ["energie"],
  },
  {
    style: "DJ Battle Tool",
    moods: ["energie"],
  },
  {
    style: "Drill",
    moods: ["energie"],
  },
  {
    style: "East Coast Hip Hop",
    moods: ["energie"],
  },
  {
    style: "G-Funk",
    moods: ["energie", "warm"],
  },
  {
    style: "Gangsta",
    moods: ["energie"],
  },
  {
    style: "Hardcore Hip-Hop",
    moods: ["energie"],
  },
  {
    style: "Hiplife",
    moods: ["energie", "warm"],
  },
  {
    style: "Horrorcore",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Hyphy",
    moods: ["energie"],
  },
  {
    style: "Instrumental",
    moods: ["rust"],
  },
  {
    style: "Jazzy Hip-Hop",
    moods: ["rust", "warm"],
  },
  {
    style: "Lo-Fi Hip Hop",
    moods: ["rust", "warm"],
  },
  {
    style: "Miami Bass",
    moods: ["energie"],
  },
  {
    style: "Old School",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Phonk",
    moods: ["energie"],
  },
  {
    style: "Political Hip-Hop",
    moods: ["energie"],
  },
  {
    style: "Pop Rap",
    moods: ["energie"],
  },
  {
    style: "Ragga HipHop",
    moods: ["energie"],
  },
  {
    style: "RnB/Swing",
    moods: ["warm"],
  },
  {
    style: "Screw",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Southern Hip Hop",
    moods: ["energie"],
  },
  {
    style: "Thug Rap",
    moods: ["energie"],
  },
  {
    style: "Trap",
    moods: ["energie"],
  },
  {
    style: "Turntablism",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Underground Hip-Hop",
    moods: ["avontuur"],
  },
  {
    style: "West Coast Hip Hop",
    moods: ["energie"],
  },
  // Jazz
  {
    style: "Afro-Cuban Jazz",
    moods: ["energie", "warm"],
  },
  {
    style: "Avant-garde Jazz",
    moods: ["avontuur"],
  },
  {
    style: "Bebop",
    moods: ["energie"],
  },
  {
    style: "Big Band Swing",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Brazilian Jazz",
    moods: ["warm"],
  },
  {
    style: "Chamber Jazz",
    moods: ["rust"],
  },
  {
    style: "Contemporary Jazz",
    moods: ["rust"],
  },
  {
    style: "Crossover Jazz",
    moods: ["warm"],
  },
  {
    style: "Dixieland",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Free Improvisation",
    moods: ["avontuur"],
  },
  {
    style: "Future Jazz",
    moods: ["avontuur"],
  },
  {
    style: "Gypsy Jazz",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Jazz",
    moods: ["rust"],
  },
  {
    style: "Jazz Blues",
    moods: ["warm"],
  },
  {
    style: "Jazz-Rock",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Latin Jazz",
    moods: ["warm", "energie"],
  },
  {
    style: "Mainstream Jazz",
    moods: ["rust", "warm"],
  },
  {
    style: "Neo-Bop",
    moods: ["rust"],
  },
  {
    style: "New Orleans Jazz",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Nu Jazz",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Post Bop",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Ragtime",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Samba Jazz",
    moods: ["warm"],
  },
  {
    style: "Spiritual Jazz",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Stride",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Swing Revival",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Third Stream",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Trad Jazz",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Vocal Jazz",
    moods: ["rust", "warm"],
  },
  // Latin
  {
    style: "Afro-Cuban",
    moods: ["warm", "energie"],
  },
  {
    style: "Axé",
    moods: ["energie"],
  },
  {
    style: "Bachata",
    moods: ["warm"],
  },
  {
    style: "Baião",
    moods: ["warm"],
  },
  {
    style: "Banda",
    moods: ["energie"],
  },
  {
    style: "Batucada",
    moods: ["energie"],
  },
  {
    style: "Bolero",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Bomba",
    moods: ["energie", "warm"],
  },
  {
    style: "Boogaloo",
    moods: ["energie", "warm"],
  },
  {
    style: "Bossa Nova Jazz",
    moods: ["warm"],
  },
  {
    style: "Candombe",
    moods: ["warm"],
  },
  {
    style: "Cha-Cha",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Champeta",
    moods: ["energie"],
  },
  {
    style: "Charanga",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Chicha",
    moods: ["warm", "avontuur"],
  },
  {
    style: "Choro",
    moods: ["warm"],
  },
  {
    style: "Compas",
    moods: ["warm"],
  },
  {
    style: "Conjunto",
    moods: ["warm"],
  },
  {
    style: "Corrido",
    moods: ["warm"],
  },
  {
    style: "Cuatro",
    moods: ["warm"],
  },
  {
    style: "Cubano",
    moods: ["warm"],
  },
  {
    style: "Cumbia Villera",
    moods: ["energie"],
  },
  {
    style: "Danzon",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Dembow",
    moods: ["energie"],
  },
  {
    style: "Descarga",
    moods: ["energie", "warm"],
  },
  {
    style: "Flamenco Pop",
    moods: ["warm", "energie"],
  },
  {
    style: "Forró",
    moods: ["warm", "energie"],
  },
  {
    style: "Frevo",
    moods: ["energie"],
  },
  {
    style: "Gaita",
    moods: ["warm"],
  },
  {
    style: "Guaguancó",
    moods: ["energie", "warm"],
  },
  {
    style: "Guajira",
    moods: ["warm"],
  },
  {
    style: "Guaracha",
    moods: ["energie", "warm"],
  },
  {
    style: "Joropo",
    moods: ["warm"],
  },
  {
    style: "Jíbaro",
    moods: ["warm"],
  },
  {
    style: "Lambada",
    moods: ["energie"],
  },
  {
    style: "Latin Pop",
    moods: ["warm"],
  },
  {
    style: "Latin Rock",
    moods: ["energie"],
  },
  {
    style: "Mambo",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Mapouka",
    moods: ["energie"],
  },
  {
    style: "Maracatu",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Mariachi",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Merengue",
    moods: ["energie"],
  },
  {
    style: "Modinha",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "MPB",
    moods: ["warm"],
  },
  {
    style: "Música Criolla",
    moods: ["warm"],
  },
  {
    style: "Norteño",
    moods: ["warm"],
  },
  {
    style: "Nueva Cancion",
    moods: ["warm"],
  },
  {
    style: "Nuevo Flamenco",
    moods: ["warm", "energie"],
  },
  {
    style: "Pachanga",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Pagode",
    moods: ["warm"],
  },
  {
    style: "Plena",
    moods: ["warm"],
  },
  {
    style: "Porro",
    moods: ["warm"],
  },
  {
    style: "Ranchera",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Reggaeton",
    moods: ["energie"],
  },
  {
    style: "Rock en Español",
    moods: ["energie"],
  },
  {
    style: "Rumba",
    moods: ["warm"],
  },
  {
    style: "Salsa Dura",
    moods: ["energie", "warm"],
  },
  {
    style: "Salsa Romantica",
    moods: ["warm"],
  },
  {
    style: "Samba-Canção",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Sertanejo",
    moods: ["warm"],
  },
  {
    style: "Son",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Son Montuno",
    moods: ["warm"],
  },
  {
    style: "Tango",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Tecnobrega",
    moods: ["energie"],
  },
  {
    style: "Tejano",
    moods: ["warm"],
  },
  {
    style: "Timba",
    moods: ["energie"],
  },
  {
    style: "Tropicália",
    moods: ["avontuur", "warm"],
  },
  {
    style: "Trova",
    moods: ["warm"],
  },
  {
    style: "Vallenato",
    moods: ["warm"],
  },
  {
    style: "Vals Criollo",
    moods: ["warm", "nostalgie"],
  },
  // Non-Music
  {
    style: "Audiobook",
    moods: [],
  },
  {
    style: "Comedy",
    moods: [],
  },
  {
    style: "Dialogue",
    moods: [],
  },
  {
    style: "Education",
    moods: [],
  },
  {
    style: "Field Recording",
    moods: [],
  },
  {
    style: "Health-Fitness",
    moods: [],
  },
  {
    style: "Interview",
    moods: [],
  },
  {
    style: "Meditation",
    moods: [],
  },
  {
    style: "Monolog",
    moods: [],
  },
  {
    style: "Poetry",
    moods: [],
  },
  {
    style: "Political",
    moods: [],
  },
  {
    style: "Promotional",
    moods: [],
  },
  {
    style: "Public Broadcast",
    moods: [],
  },
  {
    style: "Public Service Announcement",
    moods: [],
  },
  {
    style: "Radioplay",
    moods: [],
  },
  {
    style: "Religious",
    moods: [],
  },
  {
    style: "Sound Poetry",
    moods: ["avontuur"],
  },
  {
    style: "Speech",
    moods: [],
  },
  {
    style: "Spoken Word",
    moods: [],
  },
  {
    style: "Technical",
    moods: [],
  },
  // Pop
  {
    style: "Adult Contemporary",
    moods: ["rust", "warm"],
  },
  {
    style: "Arabic Pop",
    moods: ["warm"],
  },
  {
    style: "Art Pop",
    moods: ["avontuur"],
  },
  {
    style: "Baroque Pop",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Bollywood",
    moods: ["warm", "energie"],
  },
  {
    style: "Brill Building",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Bubblegum",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "C-pop",
    moods: ["warm"],
  },
  {
    style: "Cantopop",
    moods: ["warm"],
  },
  {
    style: "Chamber Pop",
    moods: ["rust", "warm"],
  },
  {
    style: "City Pop",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Crooner",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Dance Pop",
    moods: ["energie"],
  },
  {
    style: "Easy Pop",
    moods: ["rust", "warm"],
  },
  {
    style: "Electropop",
    moods: ["energie"],
  },
  {
    style: "Ethno-Pop",
    moods: ["warm"],
  },
  {
    style: "Europop",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Girl Group",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "J-pop",
    moods: ["energie"],
  },
  {
    style: "K-pop",
    moods: ["energie"],
  },
  {
    style: "Kayōkyoku",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Light Music",
    moods: ["rust", "nostalgie"],
  },
  {
    style: "Mandopop",
    moods: ["warm"],
  },
  {
    style: "Music Hall",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Novelty",
    moods: ["nostalgie"],
  },
  {
    style: "Operatic Pop",
    moods: ["warm"],
  },
  {
    style: "Parody",
    moods: ["nostalgie"],
  },
  {
    style: "Philippine Pop",
    moods: ["warm"],
  },
  {
    style: "Pop",
    moods: ["warm"],
  },
  {
    style: "Sophisti-Pop",
    moods: ["rust", "warm"],
  },
  {
    style: "Sunshine Pop",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "T-pop",
    moods: ["energie"],
  },
  {
    style: "Teen Pop",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Tin Pan Alley",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Torch Song",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Turkish Pop",
    moods: ["warm"],
  },
  {
    style: "Vocal Pop",
    moods: ["warm"],
  },
  {
    style: "Yé-Yé",
    moods: ["warm", "nostalgie"],
  },
  // Reggae
  {
    style: "Calypso Reggae",
    moods: ["warm"],
  },
  {
    style: "Dancehall Fusion",
    moods: ["energie"],
  },
  {
    style: "Digital Dancehall",
    moods: ["energie"],
  },
  {
    style: "Dub Poetry",
    moods: ["warm", "avontuur"],
  },
  {
    style: "Lovers Rock",
    moods: ["warm"],
  },
  {
    style: "Mento",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Ragga",
    moods: ["energie"],
  },
  {
    style: "Ragga Jungle",
    moods: ["energie"],
  },
  {
    style: "Reggae",
    moods: ["warm"],
  },
  {
    style: "Reggae Fusion",
    moods: ["warm"],
  },
  {
    style: "Reggae Gospel",
    moods: ["warm"],
  },
  {
    style: "Reggae-Pop",
    moods: ["warm"],
  },
  {
    style: "Rub-a-Dub",
    moods: ["warm"],
  },
  {
    style: "Samba-Reggae",
    moods: ["energie", "warm"],
  },
  {
    style: "Skinhead Reggae",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Soca",
    moods: ["energie"],
  },
  {
    style: "Steel Band",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Steelpan",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Two Tone",
    moods: ["energie", "nostalgie"],
  },
  // Rock
  {
    style: "Acid Rock",
    moods: ["avontuur"],
  },
  {
    style: "Acoustic",
    moods: ["rust", "warm"],
  },
  {
    style: "Alternative Metal",
    moods: ["energie"],
  },
  {
    style: "Anarcho-Punk",
    moods: ["energie"],
  },
  {
    style: "Apocalyptic Folk",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Arena Rock",
    moods: ["energie"],
  },
  {
    style: "Art Rock",
    moods: ["avontuur"],
  },
  {
    style: "Atmospheric Black Metal",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Avant-Prog",
    moods: ["avontuur"],
  },
  {
    style: "Avantgarde",
    moods: ["avontuur"],
  },
  {
    style: "Beat",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Beat Music",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Black Metal",
    moods: ["energie"],
  },
  {
    style: "Blackgaze",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Britpop",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Brutal Death Metal",
    moods: ["energie"],
  },
  {
    style: "C86",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Camp",
    moods: ["nostalgie"],
  },
  {
    style: "Canterbury Scene",
    moods: ["avontuur", "rust"],
  },
  {
    style: "Celtic Rock",
    moods: ["warm", "energie"],
  },
  {
    style: "Christian Rock",
    moods: ["warm"],
  },
  {
    style: "Coldwave",
    moods: ["avontuur"],
  },
  {
    style: "Country Punk",
    moods: ["warm", "energie"],
  },
  {
    style: "Cowpunk",
    moods: ["warm", "energie"],
  },
  {
    style: "Crossover Thrash",
    moods: ["energie"],
  },
  {
    style: "Crust",
    moods: ["energie"],
  },
  {
    style: "D-beat",
    moods: ["energie"],
  },
  {
    style: "Dark Folk",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Dark Rock",
    moods: ["avontuur"],
  },
  {
    style: "Darkwave Rock",
    moods: ["avontuur"],
  },
  {
    style: "Death Industrial",
    moods: ["avontuur"],
  },
  {
    style: "Death Metal",
    moods: ["energie"],
  },
  {
    style: "Deathcore",
    moods: ["energie"],
  },
  {
    style: "Deathrock",
    moods: ["avontuur"],
  },
  {
    style: "Depressive Black Metal",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Djent",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Doom Rock",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Drone Metal",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Emo",
    moods: ["rust"],
  },
  {
    style: "Emocore",
    moods: ["energie"],
  },
  {
    style: "Ethereal",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Folk Metal",
    moods: ["energie"],
  },
  {
    style: "Folk Punk",
    moods: ["warm", "energie"],
  },
  {
    style: "Freakbeat",
    moods: ["avontuur", "nostalgie"],
  },
  {
    style: "Funeral Doom",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Funk Metal",
    moods: ["energie"],
  },
  {
    style: "Garage Punk",
    moods: ["energie"],
  },
  {
    style: "Garage Revival",
    moods: ["energie"],
  },
  {
    style: "Glam",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Goregrind",
    moods: ["energie"],
  },
  {
    style: "Goth Rock",
    moods: ["avontuur"],
  },
  {
    style: "Gothabilly",
    moods: ["energie"],
  },
  {
    style: "Gothic",
    moods: ["avontuur"],
  },
  {
    style: "Gothic Metal",
    moods: ["avontuur"],
  },
  {
    style: "Gothic Rock",
    moods: ["avontuur"],
  },
  {
    style: "Grindcore",
    moods: ["energie"],
  },
  {
    style: "Groove Metal",
    moods: ["energie"],
  },
  {
    style: "Hair Metal",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Hardcore Metal",
    moods: ["energie"],
  },
  {
    style: "Hardcore Punk",
    moods: ["energie"],
  },
  {
    style: "Heartland Rock",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Indie",
    moods: ["warm"],
  },
  {
    style: "Industrial Metal",
    moods: ["energie"],
  },
  {
    style: "Industrial Rock",
    moods: ["energie"],
  },
  {
    style: "Instrumental Rock",
    moods: ["energie"],
  },
  {
    style: "J-Rock",
    moods: ["energie"],
  },
  {
    style: "Jam Band",
    moods: ["warm", "avontuur"],
  },
  {
    style: "Jangle Pop",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Krautpop",
    moods: ["avontuur"],
  },
  {
    style: "Lo-Fi Rock",
    moods: ["rust", "warm"],
  },
  {
    style: "Madchester",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Math Rock",
    moods: ["avontuur"],
  },
  {
    style: "Mathcore",
    moods: ["energie"],
  },
  {
    style: "Medieval Metal",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Melodic Black Metal",
    moods: ["energie"],
  },
  {
    style: "Melodic Death Metal",
    moods: ["energie"],
  },
  {
    style: "Melodic Hardcore",
    moods: ["energie"],
  },
  {
    style: "Merseybeat",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Metalcore",
    moods: ["energie"],
  },
  {
    style: "Mod",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Neo-Grunge",
    moods: ["energie"],
  },
  {
    style: "Neo-Prog",
    moods: ["avontuur"],
  },
  {
    style: "Neo-Psychedelia",
    moods: ["avontuur"],
  },
  {
    style: "Neoclassical Metal",
    moods: ["energie"],
  },
  {
    style: "Neue Deutsche Welle",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "New Romantic",
    moods: ["nostalgie"],
  },
  {
    style: "No Wave",
    moods: ["avontuur"],
  },
  {
    style: "Noise Pop",
    moods: ["energie"],
  },
  {
    style: "Noisecore",
    moods: ["energie"],
  },
  {
    style: "Nu Metal",
    moods: ["energie"],
  },
  {
    style: "NWOBHM",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Oi",
    moods: ["energie"],
  },
  {
    style: "Old School Metal",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Pagan Metal",
    moods: ["energie"],
  },
  {
    style: "Pop Metal",
    moods: ["energie"],
  },
  {
    style: "Pop Punk",
    moods: ["energie"],
  },
  {
    style: "Post Rock",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Post-Grunge",
    moods: ["energie"],
  },
  {
    style: "Post-Hardcore",
    moods: ["energie"],
  },
  {
    style: "Post-Industrial",
    moods: ["avontuur"],
  },
  {
    style: "Post-Metal",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Power Metal",
    moods: ["energie"],
  },
  {
    style: "Prog Folk",
    moods: ["avontuur", "warm"],
  },
  {
    style: "Progressive Death Metal",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Progressive Folk",
    moods: ["avontuur", "warm"],
  },
  {
    style: "Progressive Metal",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Proto-Metal",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Proto-Prog",
    moods: ["avontuur", "nostalgie"],
  },
  {
    style: "Proto-Punk",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Psychobilly",
    moods: ["energie"],
  },
  {
    style: "Pub Rock",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Rap Metal",
    moods: ["energie"],
  },
  {
    style: "Rapcore",
    moods: ["energie"],
  },
  {
    style: "Rautalanka",
    moods: ["nostalgie"],
  },
  {
    style: "Riot Grrrl",
    moods: ["energie"],
  },
  {
    style: "Rock",
    moods: ["energie"],
  },
  {
    style: "Rock in Opposition",
    moods: ["avontuur"],
  },
  {
    style: "Rock Opera",
    moods: ["avontuur", "nostalgie"],
  },
  {
    style: "Sadcore",
    moods: ["rust"],
  },
  {
    style: "Screamo",
    moods: ["energie"],
  },
  {
    style: "Shoegaze",
    moods: ["rust", "avontuur"],
  },
  {
    style: "Ska Punk",
    moods: ["energie"],
  },
  {
    style: "Ska-Core",
    moods: ["energie"],
  },
  {
    style: "Skate Punk",
    moods: ["energie"],
  },
  {
    style: "Slam",
    moods: ["energie"],
  },
  {
    style: "Slowcore",
    moods: ["rust"],
  },
  {
    style: "Sludge Metal",
    moods: ["energie"],
  },
  {
    style: "Southern Rock",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Space Metal",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Speed Metal",
    moods: ["energie"],
  },
  {
    style: "Stoner Rock",
    moods: ["energie", "avontuur"],
  },
  {
    style: "Street Punk",
    moods: ["energie"],
  },
  {
    style: "Surf",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Swamp Rock",
    moods: ["warm", "avontuur"],
  },
  {
    style: "Symphonic Black Metal",
    moods: ["energie"],
  },
  {
    style: "Symphonic Metal",
    moods: ["energie"],
  },
  {
    style: "Symphonic Rock",
    moods: ["avontuur"],
  },
  {
    style: "Tech Metal",
    moods: ["energie"],
  },
  {
    style: "Technical Death Metal",
    moods: ["energie"],
  },
  {
    style: "Thrash",
    moods: ["energie"],
  },
  {
    style: "Thrash Core",
    moods: ["energie"],
  },
  {
    style: "Trad Metal",
    moods: ["energie", "nostalgie"],
  },
  {
    style: "Twee Pop",
    moods: ["warm"],
  },
  {
    style: "Viking Metal",
    moods: ["energie"],
  },
  {
    style: "Visual Kei",
    moods: ["energie"],
  },
  {
    style: "Yacht Rock",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Zeuhl",
    moods: ["avontuur"],
  },
  // Stage & Screen
  {
    style: "Cabaret",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Film Score",
    moods: ["rust"],
  },
  {
    style: "Jingle",
    moods: ["nostalgie"],
  },
  {
    style: "Library Music",
    moods: ["avontuur", "nostalgie"],
  },
  {
    style: "Revue",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Score",
    moods: ["rust"],
  },
  {
    style: "Showtunes",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Stage Show",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Theme",
    moods: ["nostalgie"],
  },
  {
    style: "Vaudeville",
    moods: ["warm", "nostalgie"],
  },
  {
    style: "Video Game Music",
    moods: ["energie", "nostalgie"],
  },
];
