const API = "https://en.wikipedia.org/w/api.php?format=json&formatversion=2";
const UA = { "User-Agent": "brasileirao-2026 (https://github.com/goncalvesj081-bit/brasileirao-2026)" };
for (const [pag, re] of [
  ["2026 Campeonato Brasileiro Série A", /libertadores|sudamericana|sul-americana|relegat|tiebreak|tie-break|head-to-head|criteria|qualif/i],
  ["2026 Copa do Brasil", /libertadores|runner|qualif|berth/i],
] as const) {
  const j = await (await fetch(`${API}&action=parse&prop=wikitext&redirects=1&page=${encodeURIComponent(pag)}`, { headers: UA })).json();
  const w: string = j.parse?.wikitext ?? "SEM PAGINA";
  console.log("=====", pag);
  w.split("\n").filter((l) => re.test(l) && l.length < 600 && !/^\|\s*(team|goals|report|stadium|ref)/i.test(l)).slice(0, 45).forEach((l) => console.log(l));
}
