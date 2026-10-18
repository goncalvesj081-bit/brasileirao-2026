// Conversa com o Firebase. Carregado só quando alguém abre o bolão (o SDK é grande).

import { initializeApp } from "firebase/app";
import { getAuth, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, setDoc, deleteDoc, where } from "firebase/firestore";
import { FIREBASE } from "../../config/firebase";
import type { LinhaRanking } from "../modelo/bolao";

const app = initializeApp(FIREBASE);
const auth = getAuth(app);
const db = getFirestore(app);

export type { User };
export const aoMudarUsuario = (f: (u: User | null) => void) => onAuthStateChanged(auth, f);

/** Quem entrou pela página do Google volta aqui; um erro nessa volta só aparece se alguém perguntar. */
export const voltaDoGoogle = () => getRedirectResult(auth);

export async function entrar() {
  const prov = new GoogleAuthProvider();
  prov.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, prov);
  } catch (e) {
    // janela bloqueada ou sem suporte (app instalado no iPhone): vai pela página do Google e volta
    const code = (e as { code?: string }).code;
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") await signInWithRedirect(auth, prov);
    else throw e;
  }
}
export const sair = () => signOut(auth);

/** Garante nome e foto no ranking; não sobrescreve o apelido que a pessoa escolheu. */
export async function registrar(u: User) {
  const ref = doc(db, "usuarios", u.uid);
  const atual = await getDoc(ref);
  if (!atual.exists()) await setDoc(ref, { nome: (u.displayName ?? "Torcedor").slice(0, 30), foto: u.photoURL ?? "" });
  return (atual.data()?.nome as string | undefined) ?? (u.displayName ?? "Torcedor").slice(0, 30);
}
export const mudarNome = (u: User, nome: string) => setDoc(doc(db, "usuarios", u.uid), { nome: nome.trim().slice(0, 30), foto: u.photoURL ?? "" });

export async function meusPalpites(uid: string): Promise<Record<string, [number, number]>> {
  const snap = await getDocs(query(collection(db, "palpites"), where("uid", "==", uid)));
  const out: Record<string, [number, number]> = {};
  for (const d of snap.docs) out[d.data().jogo as string] = [d.data().gm as number, d.data().gv as number];
  return out;
}
export const salvarPalpite = (uid: string, jogo: string, rodada: number, gm: number, gv: number) =>
  setDoc(doc(db, "palpites", `${uid}_${jogo}`), { uid, jogo, rodada, gm, gv, em: serverTimestamp() });
export const apagarPalpite = (uid: string, jogo: string) => deleteDoc(doc(db, "palpites", `${uid}_${jogo}`));

export async function ranking(): Promise<{ linhas: LinhaRanking[]; atualizado: Date | null }> {
  const d = await getDoc(doc(db, "publico", "ranking"));
  const x = d.data();
  return { linhas: (x?.linhas as LinhaRanking[]) ?? [], atualizado: x?.atualizado?.toDate?.() ?? null };
}
/** Palpites de todo mundo nos jogos da rodada que já começaram: jogo → [uid, gm, gv][] */
export async function revelados(rodada: number): Promise<Record<string, [string, number, number][]>> {
  const d = await getDoc(doc(db, "publico", `rodada-${rodada}`));
  return (d.data()?.jogos as Record<string, [string, number, number][]>) ?? {};
}
export async function nomes(): Promise<Record<string, { nome: string; foto: string }>> {
  const snap = await getDocs(collection(db, "usuarios"));
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as { nome: string; foto: string }]));
}
