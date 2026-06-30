export const getCurrentDayOfWeek = (): string => {
  const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  return dias[new Date().getDay()];
};