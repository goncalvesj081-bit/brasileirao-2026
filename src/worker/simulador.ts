import type { ResultadoSimulacao } from "../modelo/simular";
import type { Pedido } from "./simulacao.worker";

/**
 * Um Worker por tipo de simulação. Se chegar um pedido novo antes do anterior terminar,
 * o anterior é descartado (o Worker é recriado), assim a tela nunca espera por conta velha.
 */
export class Simulador {
  private w: Worker | null = null;
  private rejeitar: ((e: Error) => void) | null = null;

  executar(p: Pedido): Promise<ResultadoSimulacao> {
    if (this.w && this.rejeitar) {
      this.w.terminate();
      this.w = null;
      this.rejeitar(new Cancelado());
    }
    const w = (this.w ??= new Worker(new URL("./simulacao.worker.ts", import.meta.url), { type: "module" }));
    return new Promise((ok, falha) => {
      this.rejeitar = falha;
      w.onmessage = (e: MessageEvent<ResultadoSimulacao>) => {
        this.rejeitar = null;
        ok(e.data);
      };
      w.onerror = (e) => {
        this.rejeitar = null;
        falha(new Error(e.message));
      };
      w.postMessage(p);
    });
  }
}

export class Cancelado extends Error {}
