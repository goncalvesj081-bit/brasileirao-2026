/// <reference lib="webworker" />
import { criarRng } from "../modelo/rng";
import { simular, type EntradaSimulacao } from "../modelo/simular";

export type Pedido = Omit<EntradaSimulacao, "rand"> & { semente: number };

self.onmessage = (e: MessageEvent<Pedido>) => {
  const { semente, ...resto } = e.data;
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(simular({ ...resto, rand: criarRng(semente) }));
};
