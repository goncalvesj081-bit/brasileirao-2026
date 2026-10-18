// Confere os JSON de data/ sem chamar a API. Uso: npm run validar
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CLUBES } from "../config/clubes";
import type { Jogo, Resultado } from "../src/modelo/tipos";
import { validarDados } from "../src/modelo/validar";

const ler = (n: string) => JSON.parse(readFileSync(join(import.meta.dirname, "..", "data", n), "utf8"));
const resultados = ler("resultados.json").jogos as Resultado[];
const restantes = ler("jogos.json").jogos as Jogo[];
const erros = validarDados({ clubes: CLUBES.map((c) => c.nome), resultados, restantes });
if (erros.length) {
  for (const e of erros) console.error(" - " + e);
  process.exit(1);
}
console.log(`OK: ${resultados.length} disputados, ${restantes.length} restantes.`);
