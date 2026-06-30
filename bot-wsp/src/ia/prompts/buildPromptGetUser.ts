export const buildPromptGetUser = (message: string): string => {
  return `
Eres un asistente que interpreta mensajes para buscar usuarios en la base de datos.

Analiza el siguiente mensaje y responde solo con un JSON así:

{
  "nombre": string | null, // nombre o parte del nombre del usuario a buscar, o null si no se especifica
  "birthdayMonth": number | null // número del mes de cumpleaños del usuario (1 = enero, 12 = diciembre), o null si no se especifica
}

Reglas:
- Si el usuario menciona un nombre o parte del nombre, debes colocar ese valor en "nombre".
- Si el usuario menciona un mes de cumpleaños (por ejemplo "cumpleaños en mayo"), debes colocar el número correspondiente en "birthdayMonth".
- Si no se especifica un dato, debes ponerlo como null.

Ejemplos:
Entrada: "Buscar usuarios que se llaman Juan y cumplen en mayo"
Respuesta:
{
  "nombre": "Juan",
  "birthdayMonth": 5
}

Entrada: "Buscar usuarios que cumplen en noviembre"
Respuesta:
{
  "nombre": null,
  "birthdayMonth": 11
}

Entrada: "Buscar usuarios llamados María"
Respuesta:
{
  "nombre": "María",
  "birthdayMonth": null
}

Entrada: ${message}
Respuesta:
  `.trim();
};
