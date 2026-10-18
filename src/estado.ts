import { temporada } from "../config/temporada";
import { confronto, copas, restantes, sementeReal, tabela } from "./dados";
import type { ResultadoSimulacao } from "./modelo/simular";
import type { Placar } from "./modelo/tipos";
import { Cancelado, Simulador } from "./worker/simulador";

const CHAVE = "brasileirao26-placares";
const N = temporada.modelo.simulacoes;

function lerPlacares(): Record<string, Placar> {
  const validos = new Set(restantes.map(confronto));
  try {
    const f = JSON.parse(localStorage.getItem(CHAVE) ?? "{}") as Record<string, unknown>;
    const out: Record<string, Placar> = {};
    for (const [k, v] of Object.entries(f))
      if (validos.has(k) && Array.isArray(v) && v.length === 2 && v.every((x) => Number.isInteger(x) && x >= 0)) out[k] = [v[0], v[1]];
    return out;
  } catch {
    return {};
  }
}

/** Placares do usuário, por confronto ("Mandante|Visitante"). Jogos já disputados saem sozinhos. */
export const placares: Record<string, Placar> = lerPlacares();
/** Placar pela metade enquanto o usuário digita. */
export const rascunhos: Record<string, { m: string; v: string }> = {};

export function salvarPlacares() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(placares));
  } catch {
    /* modo privado: segue sem guardar */
  }
}

export function limparPlacares() {
  for (const k of Object.keys(placares)) delete placares[k];
  for (const k of Object.keys(rascunhos)) delete rascunhos[k];
  salvarPlacares();
}

/** Placares no formato que a simulação usa (por id do jogo). */
export function placaresPorId(): Record<string, Placar> {
  const out: Record<string, Placar> = {};
  for (const g of restantes) {
    const p = placares[confronto(g)];
    if (p) out[g.id] = p;
  }
  return out;
}

export const nPlacares = () => Object.keys(placares).length;

// ---------- simulações ----------

type Ouvinte = () => void;
const ouvintes = new Set<Ouvinte>();
export const aoMudar = (f: Ouvinte) => ouvintes.add(f);
const avisar = () => ouvintes.forEach((f) => f());

export const sims: {
  real: ResultadoSimulacao | null;
  usuario: ResultadoSimulacao | null;
  /** a mesma simulação real, que já guarda distribuição de pontos e grupos (para a análise de plausibilidade) */
  base: ResultadoSimulacao | null;
} = { real: null, usuario: null, base: null };

const wReal = new Simulador();
const wUsuario = new Simulador();

const ignorarCancelado = (e: unknown) => {
  if (!(e instanceof Cancelado)) console.error(e);
};

export function simularReal() {
  wReal
    // detalhado: custa ~15% a mais e deixa a análise do simulador pronta, sem uma segunda simulação
    .executar({ tabela, restantes, n: N, semente: sementeReal, detalhado: true, copas })
    .then((r) => {
      sims.real = r;
      sims.base = r;
      avisar();
    })
    .catch(ignorarCancelado);
}

let espera: ReturnType<typeof setTimeout> | undefined;
/** Simulação com os placares do usuário, com um pequeno intervalo para não recalcular a cada tecla. */
export function agendarUsuario(ms = 350) {
  clearTimeout(espera);
  if (!nPlacares()) {
    sims.usuario = null;
    avisar();
    return;
  }
  espera = setTimeout(() => {
    const forcados = placaresPorId();
    // com todos os jogos preenchidos não há o que sortear: uma simulação basta
    const n = Object.keys(forcados).length === restantes.length ? 1 : N;
    wUsuario
      .executar({ tabela, restantes, forcados, n, semente: sementeReal + 1, copas })
      .then((r) => {
        sims.usuario = r;
        avisar();
      })
      .catch(ignorarCancelado);
  }, ms);
}
