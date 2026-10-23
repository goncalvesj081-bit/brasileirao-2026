// Conta as visitas no Firebase pela API REST (o SDK é grande demais para carregar em toda visita).
// Uma escrita ao abrir o site e outra, com as telas vistas, quando a pessoa sai ou troca de aba.

import { FIREBASE } from "../config/firebase";
import { diaDeBrasilia, incrementosDaAbertura, SECOES_CONTADAS } from "./modelo/visitas";
import { gravarPref, lerPref } from "./ui/componentes";

const URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents:commit?key=${FIREBASE.apiKey}`;
const doc = (dia: string) => `projects/${FIREBASE.projectId}/databases/(default)/documents/estatisticas/${dia}`;

function enviar(dia: string, inc: Record<string, number>) {
  const campos = Object.entries(inc).filter(([, v]) => v > 0);
  if (!campos.length) return;
  const corpo = {
    writes: [
      {
        transform: {
          document: doc(dia),
          fieldTransforms: campos.map(([fieldPath, v]) => ({ fieldPath, increment: { integerValue: String(v) } })),
        },
      },
    ],
  };
  // keepalive: a escrita da saída precisa terminar mesmo com a aba fechando
  fetch(URL, { method: "POST", body: JSON.stringify(corpo), keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
}

let telas: Record<string, number> = {};
let ultimaTela = "";

/** Chamado a cada troca de tela; abrir a mesma seção de novo (outra aba dela) não conta. */
export function contarTela(secao: string) {
  if (secao === ultimaTela || !SECOES_CONTADAS.includes(secao)) return;
  ultimaTela = secao;
  telas[secao] = (telas[secao] ?? 0) + 1;
}

function despejarTelas() {
  const inc = Object.fromEntries(Object.entries(telas).map(([s, v]) => [`telas.${s.replace("-", "_")}`, v]));
  telas = {};
  enviar(diaDeBrasilia(), inc);
}

export function iniciarContador() {
  const hoje = diaDeBrasilia();
  const ultimo = lerPref("visita", "") || null;
  const celular = matchMedia("(max-width: 899px)").matches || /Mobi|Android|iPhone/i.test(navigator.userAgent);
  const app = matchMedia("(display-mode: standalone)").matches;
  enviar(hoje, incrementosDaAbertura(ultimo, hoje, celular, app));
  gravarPref("visita", hoje);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") despejarTelas();
  });
}
