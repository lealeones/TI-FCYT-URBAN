export const buildPromptGetSession = (message: string): string => {
    return `
Eres un asistente que interpreta mensajes para buscar sesiones en la base de datos.

Analiza el siguiente mensaje y responde solo con un JSON así:

{
  "modo": "filtrar" | "proxima", // "filtrar" si el usuario quiere buscar clases específicas, "proxima" si solo quiere saber cuál es la próxima clase sin filtros
  "descripcion": string | null, // palabra clave (ej: yoga), o null
  "instructor": string | null, // nombre del instructor, o null
  "assistant": string | null, // nombre del asistente, o null
  "temporalReference": string | null, // frase sobre fecha u hora, sin convertir. Ej: "lunes siguiente a las 11 AM"
  "daysOfWeek": string[] // array con días de la semana en español, puede estar vacío
}

Reglas:
- Si el usuario pregunta por "la próxima clase", "la siguiente clase", o algo similar, debes responder con modo: "proxima" y dejar los otros campos en null o vacío.
- Si el usuario busca por nombre de clase, día o instructor, responde con modo: "filtrar" y llena los campos correspondientes.

Ejemplos:
Entrada: "Dame las clases del lunes siguiente a las 11 AM de yoga con el profesor Juan"
Respuesta:
{
  "modo": "filtrar",
  "descripcion": "yoga",
  "instructor": "Juan",
  "assistant": null,
  "temporalReference": "lunes siguiente a las 11 AM",
  "daysOfWeek": ["LUNES"]
}

Entrada: "¿Cuál es la próxima clase?"
Respuesta:
{
  "modo": "proxima",
  "descripcion": null,
  "instructor": null,
  "assistant": null,
  "temporalReference": null,
  "daysOfWeek": []
}

Entrada: ${message}
Respuesta:
`.trim();
}
