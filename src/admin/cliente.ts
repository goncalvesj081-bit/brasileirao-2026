// Firebase da tela de admin: login com Google e leitura das estatísticas. Carregado só em #/admin.

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { FIREBASE } from "../../config/firebase";
import type { Dia } from "../modelo/visitas";

const app = getApps().length ? getApp() : initializeApp(FIREBASE);
const auth = getAuth(app);
const db = getFirestore(app);
auth.languageCode = "pt-BR";

export type { User };
export const aoMudarUsuario = (f: (u: User | null) => void) => onAuthStateChanged(auth, f);
export const sair = () => signOut(auth);

export async function entrar() {
  const prov = new GoogleAuthProvider();
  prov.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, prov);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") await signInWithRedirect(auth, prov);
    else throw e;
  }
}

/** Todos os dias contados, do mais antigo ao mais recente. Os nomes das telas voltam ao formato do endereço. */
export async function lerDias(): Promise<[string, Partial<Dia>][]> {
  const snap = await getDocs(collection(db, "estatisticas"));
  return snap.docs
    .map((d) => {
      const x = d.data() as Partial<Dia>;
      const telas = Object.fromEntries(Object.entries(x.telas ?? {}).map(([k, v]) => [k.replace("_", "-"), v]));
      return [d.id, { ...x, telas }] as [string, Partial<Dia>];
    })
    .sort((a, b) => a[0].localeCompare(b[0]));
}
