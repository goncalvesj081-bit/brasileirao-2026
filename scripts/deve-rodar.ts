// Usado pelo agendamento de 30 em 30 minutos: imprime rodar=true só em dia de jogo.
// (O agendamento de 6 em 6 horas roda sempre e não passa por aqui.)

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Jogo, Meta } from "../src/modelo/tipos";
import { ehDiaDeJogo } from "./lib/agenda";

const dir = join(import.meta.dirname, "..", "data");
const { jogos } = JSON.parse(readFileSync(join(dir, "jogos.json"), "utf8")) as { jogos: Jogo[] };
const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8")) as Meta;
const rodar = ehDiaDeJogo(jogos, meta.aoVivo);
console.log(`rodar=${rodar}`);
