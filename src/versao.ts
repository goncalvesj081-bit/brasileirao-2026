// O site é uma página só, com os dados dentro do código: quem deixa a aba aberta continua vendo a
// versão antiga mesmo depois de uma publicação nova. Aqui o site confere de tempos em tempos se o
// index.html publicado aponta para outro arquivo de código; se sim, recarrega ao voltar para a aba
// (momento seguro) ou mostra um aviso para atualizar na hora.

const atual = (document.querySelector<HTMLScriptElement>('script[type="module"][src*="assets/"]')?.src ?? "").split("/").pop();
let nova = false;

async function conferir() {
  if (!atual || nova) return;
  try {
    const txt = await (await fetch("./", { cache: "no-store" })).text();
    const publicado = txt.match(/assets\/(index-[\w-]+\.js)/)?.[1];
    if (publicado && publicado !== atual) {
      nova = true;
      avisar();
    }
  } catch {
    /* sem internet: confere de novo depois */
  }
}

function avisar() {
  if (document.getElementById("versao-nova")) return;
  const b = document.createElement("button");
  b.id = "versao-nova";
  b.type = "button";
  b.textContent = "Saiu uma atualização do site · toque para atualizar";
  b.addEventListener("click", () => location.reload());
  document.body.append(b);
}

export function vigiarVersao() {
  setInterval(conferir, 5 * 60_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (nova) location.reload();
    else conferir();
  });
}
