const TZ = "America/Sao_Paulo";

/** Porcentagem do jeito brasileiro, sempre com uma casa decimal (só 0% e 100% exatos ficam sem). */
export function pct(p: number): string {
  if (p <= 0) return "0%";
  if (p < 0.001) return "<0,1%";
  if (p >= 1) return "100%";
  if (p > 0.999) return ">99,9%";
  return (p * 100).toFixed(1).replace(".", ",") + "%";
}

export const dec = (x: number, casas = 1) => x.toFixed(casas).replace(".", ",");
/** Diferença em pontos percentuais com uma casa: "+3,2" ou "−0,8". */
export const difPP = (d: number) => (d > 0 ? "+" : "−") + Math.abs(d * 100).toFixed(1).replace(".", ",");
export const saldo = (x: number) => (x > 0 ? "+" : "") + x;
export const milhar = (x: number) => x.toLocaleString("pt-BR");

const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit" });
const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fmtDiaMes = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" });

/** "Dom 18/10, 16h" ou "Seg 19/10, 20h30". */
export function dataJogo(iso: string | null, semHora = false): string {
  if (!iso) return "Data a definir";
  const d = new Date(iso);
  const partes = fmtDia.formatToParts(d);
  const sem = (partes.find((p) => p.type === "weekday")?.value ?? "").replace(".", "");
  const dia = partes.find((p) => p.type === "day")?.value;
  const mes = partes.find((p) => p.type === "month")?.value;
  const quando = `${sem.charAt(0).toUpperCase()}${sem.slice(1)} ${dia}/${mes}`;
  if (semHora) return `${quando}, horário a definir`;
  const [h, m] = fmtHora.format(d).split(":");
  return `${quando}, ${+h}h${m === "00" ? "" : m}`;
}

/** "17/10 às 23h05" */
export function dataHora(iso: string): string {
  const d = new Date(iso);
  const [h, m] = fmtHora.format(d).split(":");
  return `${fmtDiaMes.format(d)} às ${+h}h${m}`;
}

export const rodadaOrdinal = (r: number) => `${r}ª rodada`;
