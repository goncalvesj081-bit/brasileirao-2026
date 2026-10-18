// Usado pelo agendamento de 30 em 30 minutos: imprime rodar=true só em dia de jogo.
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
const rodar = ehDiaDeJogo([...jogos, ...daCopa], meta.aoVivo);
console.log(`rodar=${rodar}`);
