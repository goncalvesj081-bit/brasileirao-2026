// Cadastro do bolão: dados para falar com quem ganhar. Ficam fora do ranking (só o dono e o
// administrador do Firebase leem); o nome do ranking é outro, escolhido pela pessoa.

export interface Perfil {
  /** nome completo, para o contato */
  nome: string;
  /** AAAA-MM-DD */
  nascimento: string;
  /** só dígitos, com o 55 do Brasil na frente */
  whatsapp: string;
}

/** Dígitos do WhatsApp com o 55 na frente; aceita o número digitado com ou sem máscara e com ou sem +55. */
export function normalizarWhatsapp(txt: string): string {
  let d = txt.replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d ? `55${d}` : "";
}

/** Máscara enquanto digita: (11) 98765-4321. */
export function mascaraWhatsapp(txt: string): string {
  let d = txt.replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = d.slice(0, 2),
    resto = d.slice(2);
  const corte = resto.length > 8 ? 5 : 4;
  return resto.length > corte ? `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}` : `(${ddd}) ${resto}`;
}

/** Número guardado (55 + DDD + número) de volta para a máscara. */
export const whatsappParaTela = (w: string) => mascaraWhatsapp(w.startsWith("55") ? w.slice(2) : w);

/** Problema no cadastro, em português, ou null se está tudo certo. `hoje` em AAAA-MM-DD. */
export function problemaNoPerfil(p: Perfil, hoje: string): string | null {
  const nome = p.nome.trim();
  if (nome.length < 3 || !/\s/.test(nome)) return "Digite seu nome completo (nome e sobrenome).";
  if (nome.length > 60) return "O nome pode ter até 60 caracteres.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.nascimento)) return "Preencha sua data de nascimento.";
  const [a, m, d] = p.nascimento.split("-").map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  if (data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d || a < 1900 || p.nascimento > hoje) return "Essa data de nascimento não parece certa.";
  const w = p.whatsapp;
  if (!/^55\d{10,11}$/.test(w) || w[2] === "0") return "Digite o WhatsApp com DDD, por exemplo (11) 98765-4321.";
  return null;
}
