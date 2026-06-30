export function validateCustomId(input: string, prefixChar: string): { customId?: string; error?: string } {
  const escapedChar = prefixChar.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); // Escapar cualquier char especial
  const regex = new RegExp(`^${escapedChar}-[A-Za-z0-9]{3}`);
  const idMatch = input.match(regex);

  if (!idMatch) {
    return {
      error: `ID inválido. Debe comenzar con ${prefixChar}- seguido de 3 letras o dígitos.`,
    };
  }

  return {
    customId: idMatch[0],
  };
}