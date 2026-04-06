const MOULAVI_INDEX_PATHS = [
  "shams/ghazalsh",
  "shams/mostadrakat",
  "shams/tarjeeat",
  "shams/robaeesh",
  "masnavi/daftar1",
  "masnavi/daftar2",
  "masnavi/daftar3",
  "masnavi/daftar4",
  "masnavi/daftar5",
  "masnavi/daftar6",
] as const;

type PoetPoolEntry = {
  author: string;
  labelFa: string;
  /** One path chosen at random per roll (first level under author on Ganjoor). */
  indexPaths: readonly string[];
  useChunkSplit: boolean;
};

const POET_POOL: PoetPoolEntry[] = [
  { author: "hafez", labelFa: "حافظ", indexPaths: ["ghazal"], useChunkSplit: false },
  { author: "khayyam", labelFa: "خیام", indexPaths: ["robaee"], useChunkSplit: false },
  {
    author: "moulavi",
    labelFa: "مولانا",
    indexPaths: MOULAVI_INDEX_PATHS,
    useChunkSplit: true,
  },
  {
    author: "saadi",
    labelFa: "سعدی",
    indexPaths: ["divan/ghazals", "divan/robaees", "divan/ghetes"],
    useChunkSplit: false,
  },
  {
    author: "ferdousi",
    labelFa: "فردوسی",
    indexPaths: [
      "shahname/aghaz",
      "shahname/sohrab",
      "shahname/kkhosro",
      "shahname/qmars",
    ],
    useChunkSplit: false,
  },
  {
    author: "nezami",
    labelFa: "نظامی",
    indexPaths: [
      "5ganj/makhzanolasrar",
      "5ganj/khosro-shirin",
      "5ganj/leyli-majnoon",
      "5ganj/7peykar",
    ],
    useChunkSplit: false,
  },
];

export { MOULAVI_INDEX_PATHS, POET_POOL, type PoetPoolEntry };
