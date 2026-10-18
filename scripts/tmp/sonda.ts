const API = "https://en.wikipedia.org/w/api.php?format=json&formatversion=2";
const UA = { "User-Agent": "brasileirao-2026 (https://github.com/goncalvesj081-bit/brasileirao-2026)" };
const { parse } = await (await fetch(`${API}&action=parse&prop=wikitext&redirects=1&page=${encodeURIComponent("2026 SE Palmeiras season")}`, { headers: UA })).json();
const w: string = parse.wikitext;
const a = w.indexOf("=== Série A ===");
const m = w.indexOf("==== Matches ====", a);
console.log(w.slice(m, m + 2500));
