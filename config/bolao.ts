// Prêmios e dados do regulamento do bolão. Edite aqui: o site mostra no Ranking e no Regulamento.
// Prêmio vazio ("") aparece como "a definir".

export const bolao = {
  /** quem organiza e responde pelo bolão (aparece no regulamento) */
  organizador: "",
  /** contato para dúvidas e para quem ganhar (e-mail ou WhatsApp) */
  contato: "",
  premios: {
    rodada: "",
    turno: "",
    temporada: "",
  },
  /** dias, depois do contato, para quem ganhou responder e enviar os documentos */
  prazoResgate: 30,
  /** idade mínima para receber prêmio */
  idadeMinima: 18,
} as const;
