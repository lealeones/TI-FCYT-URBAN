/**
 * Verifica si el mensaje es una palabra de salida
 * @returns true si debe salir del flujo, false en caso contrario
 */
export const shouldExitFlow = (message: string): boolean => {
  // normalizo y comparo palabra completa
  const norm = (message ?? "")
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .trim();

  const finishFlow = new Set(['chau', 'adios', 'salir', 'cancelar']);

  return finishFlow.has(norm);
};

/**
 * Maneja la salida del flujo con mensaje y limpieza de estado
 * Retorna true si se debe salir, false si no
 */
export const exitFlow = async (
  message: string,
  endFlow: (message?: string) => Promise<void> | void,
  state: any
): Promise<boolean> => {
  if (shouldExitFlow(message)) {
    state?.clear?.();
    await endFlow('👋 Nos vemos pronto');
    return true;
  }
  return false;
};

/**
 * Valida si la entrada está dentro de las opciones válidas
 * Si no es válida, ejecuta fallBack con el mensaje de error
 * @returns true si la opción es válida, false si no lo es (y ejecuta fallBack)
 */
export const validateOption = (
  input: string,
  validOptions: string[],
  fallBack: (message: string) => any
): boolean => {
  if (!validOptions.includes(input)) {
    const optionsText = validOptions.map(opt => `*${opt}*`).join(', ');
    fallBack(`❌ Opción no válida. Escribe ${optionsText} o *cancelar* para salir.`);
    return false;
  }
  return true;
};
