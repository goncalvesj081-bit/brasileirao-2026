import { defineConfig } from "vitest/config";

export default defineConfig({
  // caminhos relativos: funciona em usuario.github.io/<repo>/ sem configurar o nome do repositório
  base: "./",
  build: { target: "es2022" },
  worker: { format: "es" },
  test: { include: ["tests/**/*.test.ts"] },
});
