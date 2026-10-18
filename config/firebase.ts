// Projeto do Firebase usado pelo bolão (login com Google e palpites).
// Estes valores são públicos (vão para o navegador); a segurança está nas regras em firestore.rules.
// Enquanto apiKey estiver vazio, a página do bolão mostra que ele ainda não foi configurado.
export const FIREBASE = {
  apiKey: "",
  authDomain: "brasileirao-2026.firebaseapp.com",
  projectId: "brasileirao-2026",
  appId: "",
};

export const bolaoConfigurado = () => !!FIREBASE.apiKey && !!FIREBASE.projectId;
