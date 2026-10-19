import { describe, expect, it } from "vitest";
import { mascaraWhatsapp, normalizarWhatsapp, problemaNoPerfil, whatsappParaTela } from "../src/modelo/perfil";

describe("cadastro do bolão", () => {
  it("WhatsApp: guarda só dígitos com 55, aceita +55 e máscara", () => {
    expect(normalizarWhatsapp("(11) 98765-4321")).toBe("5511987654321");
    expect(normalizarWhatsapp("+55 11 98765-4321")).toBe("5511987654321");
    expect(normalizarWhatsapp("1132654321")).toBe("551132654321");
    expect(normalizarWhatsapp("")).toBe("");
  });

  it("WhatsApp: máscara enquanto digita e de volta para a tela", () => {
    expect(mascaraWhatsapp("1")).toBe("(1");
    expect(mascaraWhatsapp("1198")).toBe("(11) 98");
    expect(mascaraWhatsapp("1132654321")).toBe("(11) 3265-4321");
    expect(mascaraWhatsapp("11987654321")).toBe("(11) 98765-4321");
    expect(mascaraWhatsapp("1198765432199")).toBe("(11) 98765-4321");
    expect(whatsappParaTela("5511987654321")).toBe("(11) 98765-4321");
  });

  it("valida nome completo, data e WhatsApp", () => {
    const ok = { nome: "Maria Souza", nascimento: "1990-05-20", whatsapp: "5511987654321" };
    const hoje = "2026-10-18";
    expect(problemaNoPerfil(ok, hoje)).toBeNull();
    expect(problemaNoPerfil({ ...ok, nome: "Maria" }, hoje)).toMatch(/sobrenome/);
    expect(problemaNoPerfil({ ...ok, nascimento: "" }, hoje)).toMatch(/nascimento/);
    expect(problemaNoPerfil({ ...ok, nascimento: "1990-02-30" }, hoje)).toMatch(/não parece/);
    expect(problemaNoPerfil({ ...ok, nascimento: "2027-01-01" }, hoje)).toMatch(/não parece/);
    expect(problemaNoPerfil({ ...ok, whatsapp: "55119876" }, hoje)).toMatch(/DDD/);
    expect(problemaNoPerfil({ ...ok, whatsapp: "5501987654321" }, hoje)).toMatch(/DDD/);
  });
});
