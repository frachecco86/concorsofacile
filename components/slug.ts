/**
 * `slug` è usato sia dal server (per generare i percorsi) sia dal client
 * (per costruire i link). Vive in un file senza direttive così resta neutro.
 */
export function slug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
