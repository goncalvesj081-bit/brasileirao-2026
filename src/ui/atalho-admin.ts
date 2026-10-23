// Atalho para a tela de admin: aparece só nos aparelhos em que um admin entrou em #/admin.
// Não é proteção (os números só abrem para a conta de admin); só evita mostrar o link para todo mundo.

import { gravarPref, lerPref } from "./componentes";

export const mostrarAtalhoAdmin = () => lerPref("admin", "") === "1";
export const lembrarAdmin = (sim: boolean) => gravarPref("admin", sim ? "1" : "");
