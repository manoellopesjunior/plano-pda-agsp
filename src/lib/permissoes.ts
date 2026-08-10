import type { AppRole } from "@/lib/admin.shared";
import type { PostoId } from "@/lib/agsp";

/**
 * Regra única de autorização operacional do sistema.
 *
 * ADMINISTRADOR   → aciona PDA 1..6, trata e reseta a central
 * POSTO/OFICIAL   → aciona somente o PDA do posto vinculado, trata esse posto
 * USUÁRIO COMUM   → somente visualização
 */
export function podeAcionarPda(
  role: AppRole | null,
  postoVinculado: number | null,
  alvo: PostoId,
): boolean {
  if (role === "admin") return true;
  if (role === "oficial") return String(postoVinculado ?? "") === alvo;
  return false;
}

export function podeTratar(
  role: AppRole | null,
  postoVinculado: number | null,
  alvo: PostoId | "todos",
): boolean {
  if (role === "admin") return true;
  if (role !== "oficial") return false;
  if (alvo === "todos") return false;
  return String(postoVinculado ?? "") === alvo;
}

export function podeOperar(role: AppRole | null): boolean {
  return role === "admin" || role === "oficial";
}
