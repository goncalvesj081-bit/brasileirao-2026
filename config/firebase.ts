// Projeto do Firebase usado pelo bolão (login com Google e palpites).
// Estes valores são públicos (vão para o navegador); a segurança está nas regras em firestore.rules.
// Enquanto apiKey estiver vazio, a página do bolão mostra que ele ainda não foi configurado.
export const FIREBASE = {
  apiKey: "AIzaSyCaDh3bF01Ng_8blBJqNb1zYB4M_sAuEg8",
  authDomain: "brasileirao-2026.firebaseapp.com",
  projectId: "brasileirao-2026",
  appId: "1:745204138909:web:66cf50930972e25b1f6574",
};

export const bolaoConfigurado = () => !!FIREBASE.apiKey && !!FIREBASE.projectId;
