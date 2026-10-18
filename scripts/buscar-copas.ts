// Mostra a situação das copas lida da ESPN, sem gravar nada. Uso: npm run copas
import { temporada } from "../config/temporada";
import { buscarCopas } from "./lib/copas-espn";

const copas = await buscarCopas(temporada.ano);
console.log(JSON.stringify(copas, null, 1));
