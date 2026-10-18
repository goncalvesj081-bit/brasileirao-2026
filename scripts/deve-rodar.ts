// Usado pelo agendamento de 10 em 10 minutos: imprime rodar=true só em dia de jogo.
// (O agendamento de 6 em 6 horas roda sempre e não passa por aqui.)

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Copas } from "../src/modelo/copas";
import type { Jogo, Meta } from "../src/modelo/tipos";
import { ehDiaDeJogo } from "./lib/agenda";

const dir = join(import.meta.dirname, "..", "data");
const { jogos } = JSON.parse(readFileSync(join(dir, "jogos.json"), "utf8")) as { jogos: Jogo[] };
const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8")) as Meta;
// dias de jogo das copas também contam (o resultado mexe nas vagas)
let datasCopas: string[] = [];
try {
  datasCopas = (JSON.parse(readFileSync(join(dir, "copas.json"), "utf8")) as Copas).jogos ?? [];
} catch {
  /* sem copas.json: só o Brasileirão */
}
const daCopa: Jogo[] = datasCopas.map((data, k) => ({ id: `copa-${k}`, rodada: 0, mandante: "", visitante: "", data }));
// e os da Série B
let daSerieB: Jogo[] = [];
try {
  daSerieB = (JSON.parse(readFileSync(join(dir, "serieb.json"), "utf8")) as { restantes: Jogo[] }).restantes ?? [];
} catch {
  /* sem serieb.json */
}
const rodar = ehDiaDeJogo([...jogos, ...daCopa, ...daSerieB], meta.aoVivo);
console.log(`rodar=${rodar}`);
