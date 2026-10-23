// Contas que podem abrir a tela de admin (#/admin), pelo ID da conta no Firebase.
// Não é o e-mail porque o repositório é público. Para descobrir o seu ID, entre em #/admin:
// enquanto a conta não for admin, a tela mostra o ID dela.
// A mesma lista precisa estar em firestore.rules (função admin); um teste confere as duas.
export const ADMINS: string[] = ["ug6pZd4qdhaoV7N0VQTyO9zzcj83"];
