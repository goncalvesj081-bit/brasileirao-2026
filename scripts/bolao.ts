// Bolão: roda na atualização automática, com a conta de serviço do Firebase (segredo FIREBASE_SERVICE_ACCOUNT).
// 1) publica as regras do banco (firestore.rules);
// 2) grava o horário de início de cada jogo em jogos/{id} (é o que trava os palpites);
// 3) quando um jogo começa, copia os palpites dele para publico/rodada-N (todos passam a ver);
// 4) recalcula o ranking em publico/ranking.
// Para gastar pouco da cota grátis, só lê o banco quando algo mudou (marcado em publico/estado).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { getSecurityRules } from "firebase-admin/security-rules";
import { montarRanking, type Palpite } from "../src/modelo/bolao";
import { hash } from "../src/modelo/rng";
import type { Jogo, Resultado } from "../src/modelo/tipos";

const RAIZ = join(import.meta.dirname, "..");
const ler = <T>(n: string) => JSON.parse(readFileSync(join(RAIZ, n), "utf8")) as T;

async function main() {
  const conta = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!conta) {
    console.log("Bolão: FIREBASE_SERVICE_ACCOUNT não definido; nada a fazer.");
    return;
  }
  const app = initializeApp({ credential: cert(JSON.parse(conta)) });
  const db = getFirestore(app);

  const resultados = ler<{ jogos: Resultado[] }>("data/resultados.json").jogos;
  const restantes = ler<{ jogos: Jogo[] }>("data/jogos.json").jogos;
  const regras = readFileSync(join(RAIZ, "firestore.rules"), "utf8");

  const estadoRef = db.doc("publico/estado");
  const estado = ((await estadoRef.get()).data() ?? {}) as { regras?: string; jogos?: string; resultados?: string; revelados?: string[] };
  const novo = { ...estado, revelados: [...(estado.revelados ?? [])] };

  // 1) regras
  const hRegras = hash(regras);
  if (estado.regras !== hRegras) {
    try {
      await getSecurityRules(app).releaseFirestoreRulesetFromSource(regras);
      novo.regras = hRegras;
      console.log("Bolão: regras publicadas.");
    } catch (e) {
      console.warn(`Bolão: não deu para publicar as regras (${(e as Error).message}). Cole firestore.rules no console do Firebase.`);
    }
  }

  // 2) horário dos jogos (jogo encerrado: o horário em que foi jogado; adiado sem data: sem horário, palpite fechado)
  const todos: Jogo[] = [...resultados, ...restantes];
  const hJogos = hash(JSON.stringify(todos.map((g) => [g.id, g.data, g.rodada])));
  if (estado.jogos !== hJogos) {
    for (let i = 0; i < todos.length; i += 400) {
      const lote = db.batch();
      for (const g of todos.slice(i, i + 400))
        lote.set(db.doc(`jogos/${g.id}`), {
          inicio: g.data ? Timestamp.fromDate(new Date(g.data)) : null,
          rodada: g.rodada,
          mandante: g.mandante,
          visitante: g.visitante,
        });
      await lote.commit();
    }
    novo.jogos = hJogos;
    console.log(`Bolão: ${todos.length} jogos gravados.`);
  }

  // 3) revela os palpites dos jogos que já começaram
  const agora = Date.now();
  const comecaram = todos.filter((g) => g.data && Date.parse(g.data) <= agora && !novo.revelados.includes(g.id));
  for (const g of comecaram) {
    const snap = await db.collection("palpites").where("jogo", "==", g.id).get();
    const lista = snap.docs.map((d) => {
      const p = d.data() as Palpite;
      return [p.uid, p.gm, p.gv];
    });
    await db.doc(`publico/rodada-${g.rodada}`).set({ jogos: { [g.id]: lista } }, { merge: true });
    novo.revelados.push(g.id);
  }
  if (comecaram.length) console.log(`Bolão: palpites revelados em ${comecaram.length} jogo(s).`);

  // 4) ranking, quando há jogo novo revelado ou resultado novo
  const hRes = hash(JSON.stringify(resultados.map((r) => [r.id, r.gm, r.gv])));
  if (comecaram.length || estado.resultados !== hRes) {
    const publico = await db.collection("publico").get();
    const palpites: Palpite[] = [];
    for (const d of publico.docs.filter((x) => x.id.startsWith("rodada-"))) {
      const jogos = (d.data().jogos ?? {}) as Record<string, [string, number, number][]>;
      for (const [jogo, lista] of Object.entries(jogos)) for (const [uid, gm, gv] of lista) palpites.push({ uid, jogo, gm, gv });
    }
    const usuarios: Record<string, { nome: string; foto?: string }> = {};
    for (const d of (await db.collection("usuarios").get()).docs) usuarios[d.id] = d.data() as { nome: string; foto?: string };
    const linhas = montarRanking(palpites, resultados, usuarios);
    await db.doc("publico/ranking").set({ atualizado: FieldValue.serverTimestamp(), linhas });
    novo.resultados = hRes;
    console.log(`Bolão: ranking com ${linhas.length} participante(s).`);
  }

  await estadoRef.set(novo);
}

main().catch((e) => {
  // o bolão nunca derruba a atualização do site
  console.warn(`Bolão: erro (${e instanceof Error ? e.message : e}).`);
});
