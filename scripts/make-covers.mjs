// Generates the illustrated placeholder covers in /public/covers. Run: node scripts/make-covers.mjs
// Real photography can replace any of these from the admin UI (event cover URL / settings hero URL).
import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("public/covers", { recursive: true });

const tree = (x, y, s = 1, c = "#2f7a58") =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="0" width="12" height="60" rx="4" fill="#6b4f3a"/><circle cx="0" cy="-8" r="46" fill="${c}"/><circle cx="-26" cy="14" r="30" fill="${c}"/><circle cx="26" cy="14" r="30" fill="${c}"/></g>`;
const person = (x, y, c = "#1f5d45", s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-64" r="14" fill="#e8c5a4"/><path d="M-20 0 v-40 a20 20 0 0 1 40 0 v40 z" fill="${c}"/></g>`;
const bag = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-18 0 q-6 -34 6 -46 h24 q12 12 6 46 z" fill="#3b4b41"/><path d="M-6 -46 q6 -10 12 0" stroke="#3b4b41" stroke-width="5" fill="none"/></g>`;

function scene({ w = 1200, h = 800, sky = ["#f6f1e4", "#dcede3"], sun = "#f3d9a4", hills = ["#a9cdb6", "#7faf91", "#4f8d6d", "#2f6e52"], art = "" }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<circle cx="${w * 0.78}" cy="${h * 0.2}" r="${h * 0.09}" fill="${sun}"/>
<path d="M0 ${h * 0.55} C ${w * 0.2} ${h * 0.42}, ${w * 0.4} ${h * 0.5}, ${w * 0.55} ${h * 0.46} S ${w * 0.9} ${h * 0.4}, ${w} ${h * 0.48} V${h} H0z" fill="${hills[0]}"/>
<path d="M0 ${h * 0.65} C ${w * 0.25} ${h * 0.55}, ${w * 0.5} ${h * 0.7}, ${w * 0.7} ${h * 0.6} S ${w * 0.95} ${h * 0.58}, ${w} ${h * 0.62} V${h} H0z" fill="${hills[1]}"/>
<path d="M0 ${h * 0.78} C ${w * 0.3} ${h * 0.7}, ${w * 0.6} ${h * 0.82}, ${w} ${h * 0.72} V${h} H0z" fill="${hills[2]}"/>
<path d="M0 ${h * 0.9} C ${w * 0.4} ${h * 0.84}, ${w * 0.7} ${h * 0.94}, ${w} ${h * 0.86} V${h} H0z" fill="${hills[3]}"/>
${art}</svg>`;
}

const covers = {
  cleanup: scene({
    art: [tree(180, 430, 1.1), tree(330, 470, 0.8, "#3d8a64"), tree(980, 420, 1.2), person(520, 660, "#1f5d45"), person(620, 690, "#e0a458", 1.1), person(730, 655, "#7faf91"), bag(460, 690), bag(800, 700)].join(""),
  }),
  trees: scene({
    sky: ["#eef4e6", "#cfe6d6"],
    art: [tree(150, 400, 1.3), tree(340, 460, 0.9, "#3d8a64"), tree(560, 430, 1.1), tree(820, 470, 0.8, "#3d8a64"), tree(1030, 410, 1.3), person(700, 690, "#1f5d45", 1.1), `<g transform="translate(760 700)"><rect x="-4" y="-40" width="8" height="40" fill="#6b4f3a"/><circle cx="0" cy="-48" r="16" fill="#5aa47c"/></g>`].join(""),
  }),
  literacy: scene({
    sky: ["#f7f3e6", "#e3efe6"],
    art: `<g transform="translate(330 380)"><rect width="540" height="330" rx="22" fill="#24302a"/><rect x="18" y="18" width="504" height="294" rx="10" fill="#f8fbf8"/><rect x="50" y="56" width="200" height="16" rx="8" fill="#1f5d45"/><rect x="50" y="92" width="420" height="10" rx="5" fill="#a9cdb6"/><rect x="50" y="116" width="360" height="10" rx="5" fill="#a9cdb6"/><circle cx="400" cy="220" r="56" fill="#dcede3"/><path d="M372 220 l20 22 l40 -46" stroke="#1f5d45" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="-60" y="330" width="660" height="26" rx="13" fill="#3b4b41"/></g>${person(200, 700, "#e0a458", 1.1)}${person(1000, 700, "#1f5d45", 1.1)}`,
  }),
  food: scene({
    sky: ["#f9f0dc", "#e5efe0"],
    sun: "#f0c987",
    art: `<g transform="translate(300 470)"><rect width="600" height="220" rx="16" fill="#b98a5c"/><rect y="0" width="600" height="46" rx="16" fill="#9c7248"/>${[60, 150, 240, 330, 420, 510].map((x, i) => `<circle cx="${x}" cy="${-6 - (i % 2) * 14}" r="42" fill="${["#e0a458", "#7faf91", "#c96f5a", "#f3d9a4", "#4f8d6d", "#e0a458"][i]}"/>`).join("")}</g>${person(180, 700, "#1f5d45", 1.1)}${person(1010, 700, "#7faf91", 1.1)}`,
  }),
  health: scene({
    sky: ["#f2f7f3", "#d8ece0"],
    art: `<g transform="translate(600 430)"><circle r="180" fill="#ffffff" opacity=".9"/><rect x="-28" y="-110" width="56" height="220" rx="14" fill="#1f5d45"/><rect x="-110" y="-28" width="220" height="56" rx="14" fill="#1f5d45"/></g>${person(260, 700, "#7faf91", 1.1)}${person(950, 700, "#1f5d45", 1.1)}`,
  }),
  walk: scene({
    sky: ["#fbf3df", "#dcede3"],
    art: `<path d="M-20 700 C 300 640, 600 760, 1220 660" stroke="#f3ead2" stroke-width="60" fill="none"/>${[160, 300, 430, 560, 690, 820, 960].map((x, i) => person(x, 650 + (i % 2) * 24, ["#1f5d45", "#e0a458", "#7faf91"][i % 3], 0.9)).join("")}${tree(120, 420, 1)}${tree(1080, 430, 1.1)}`,
  }),
  community: scene({
    art: `${[220, 470, 720, 950].map((x, i) => `<g transform="translate(${x} ${470 + (i % 2) * 40})"><rect width="190" height="150" fill="${["#f3ead2", "#ffffff", "#f6e1c3", "#eaf3ec"][i]}"/><path d="M-14 0 L95 -80 L204 0z" fill="#1f5d45"/><rect x="70" y="60" width="50" height="90" fill="#7faf91"/></g>`).join("")}${person(560, 720, "#1f5d45", 1.1)}${person(660, 730, "#e0a458", 1)}`,
  }),
  hero: scene({
    w: 1600, h: 1000,
    sky: ["#fbf6e8", "#d8ecdf"],
    art: [tree(180, 520, 1.4), tree(420, 590, 1), tree(1290, 520, 1.5, "#3d8a64"), tree(1500, 600, 1),
      person(560, 850, "#1f5d45", 1.5), person(690, 880, "#e0a458", 1.6), person(830, 850, "#7faf91", 1.5), person(960, 890, "#1f5d45", 1.6), person(1080, 860, "#c96f5a", 1.4), bag(470, 880), bag(1180, 890)].join(""),
  }),
};

for (const [name, svg] of Object.entries(covers)) writeFileSync(`public/covers/${name}.svg`, svg);
console.log("Wrote", Object.keys(covers).length, "covers");
