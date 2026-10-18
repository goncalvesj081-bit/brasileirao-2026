// "Meu time": guardado só neste aparelho.

import { gravarPref, lerPref } from "./componentes";
import { nomesClubes } from "../dados";

export function favorito(): string | null {
  const c = lerPref("favorito", "");
  return nomesClubes.includes(c) ? c : null;
}

export function alternarFavorito(clube: string) {
  gravarPref("favorito", favorito() === clube ? "" : clube);
}
