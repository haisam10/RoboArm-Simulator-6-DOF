export interface Planet {
  id: string;
  name: string;
  /** surface gravity in m/s² */
  g: number;
  emoji: string;
  /** scene background / fog colour */
  sky: string;
  /** floor colour */
  ground: string;
  /** grid line colour */
  grid: string;
  /** UI accent colour */
  accent: string;
  /** whether a star-field should be rendered */
  stars: boolean;
  fact: string;
}

export const PLANETS: Planet[] = [
  {
    id: "earth",
    name: "Earth",
    g: 9.81,
    emoji: "🌍",
    sky: "#7fb2e5",
    ground: "#48665a",
    grid: "#8fb3a2",
    accent: "#38bdf8",
    stars: false,
    fact: "Home sweet home. Standard reference gravity.",
  },
  {
    id: "moon",
    name: "Moon",
    g: 1.62,
    emoji: "🌕",
    sky: "#06070c",
    ground: "#7c7c82",
    grid: "#a3a3ab",
    accent: "#cbd5e1",
    stars: true,
    fact: "Only 1/6 of Earth's gravity — objects fall in slow motion.",
  },
  {
    id: "mars",
    name: "Mars",
    g: 3.71,
    emoji: "🔴",
    sky: "#d4895a",
    ground: "#9a4a2b",
    grid: "#c9774d",
    accent: "#fb923c",
    stars: false,
    fact: "The red planet. 38% of Earth's gravity.",
  },
  {
    id: "mercury",
    name: "Mercury",
    g: 3.7,
    emoji: "☿️",
    sky: "#1b1c24",
    ground: "#5d5b59",
    grid: "#8a8784",
    accent: "#a8a29e",
    stars: true,
    fact: "Tiny and close to the Sun, with Mars-like gravity.",
  },
  {
    id: "venus",
    name: "Venus",
    g: 8.87,
    emoji: "🟡",
    sky: "#d7b46c",
    ground: "#8b6a3b",
    grid: "#b48f55",
    accent: "#fbbf24",
    stars: false,
    fact: "Almost Earth-like gravity under thick yellow clouds.",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    g: 24.79,
    emoji: "🪐",
    sky: "#c7a67c",
    ground: "#8c674a",
    grid: "#b38b65",
    accent: "#f59e0b",
    stars: false,
    fact: "2.5× Earth gravity — everything slams down fast.",
  },
  {
    id: "saturn",
    name: "Saturn",
    g: 10.44,
    emoji: "💫",
    sky: "#e3cf9c",
    ground: "#a68b5b",
    grid: "#c9ac75",
    accent: "#fcd34d",
    stars: false,
    fact: "Slightly stronger than Earth despite being so light.",
  },
  {
    id: "uranus",
    name: "Uranus",
    g: 8.69,
    emoji: "🧊",
    sky: "#9fdbe6",
    ground: "#4d8d98",
    grid: "#77b5bf",
    accent: "#67e8f9",
    stars: false,
    fact: "An ice giant with slightly less pull than Earth.",
  },
  {
    id: "neptune",
    name: "Neptune",
    g: 11.15,
    emoji: "🔵",
    sky: "#3b58d1",
    ground: "#22398c",
    grid: "#3d59b9",
    accent: "#818cf8",
    stars: false,
    fact: "Deep blue and 14% stronger gravity than Earth.",
  },
  {
    id: "pluto",
    name: "Pluto",
    g: 0.62,
    emoji: "🤍",
    sky: "#131420",
    ground: "#a6988b",
    grid: "#c4b6a6",
    accent: "#e2e8f0",
    stars: true,
    fact: "Drop a cube and go make tea. It'll still be falling.",
  },
  {
    id: "sun",
    name: "Sun",
    g: 274,
    emoji: "☀️",
    sky: "#ffb347",
    ground: "#c2581a",
    grid: "#ff9b4a",
    accent: "#fb923c",
    stars: false,
    fact: "28× Earth gravity. Purely hypothetical (and very hot).",
  },
  {
    id: "space",
    name: "Zero-G",
    g: 0,
    emoji: "🚀",
    sky: "#03040a",
    ground: "#1a1d29",
    grid: "#2f3550",
    accent: "#a78bfa",
    stars: true,
    fact: "Deep space. Released objects simply float away.",
  },
  {
    id: "custom",
    name: "Custom",
    g: 9.81,
    emoji: "🎛️",
    sky: "#1e293b",
    ground: "#334155",
    grid: "#64748b",
    accent: "#2dd4bf",
    stars: true,
    fact: "Dial in any gravity you like.",
  },
];

export const getPlanet = (id: string): Planet =>
  PLANETS.find((p) => p.id === id) ?? PLANETS[0];
