export const builderSubscriptionPrompt = (message: string): string => {
    return `
Eres un asistente que solo responde en formato JSON válido y nunca agrega texto adicional.

Debes inferir y devolver solo la estructura JSON con este formato:
{
  "user": {
    "name": string,
    "customId": string | null
  },
  "product": {
    "description": string,
    "customId": string | null
  },
  "discount": number | null,
  "mode": "assistant" | "instructor"
}

Reglas:
- El "customId" es un string con el formato: una letra, seguida de un guion y tres caracteres (ejemplo: A-123). Si no está presente, devolver null.
- El "discount" debe ser un número si el mensaje hace referencia a un descuento, caso contrario devolver null.
- El "mode" debe ser "assistant" por defecto. Si el mensaje menciona que el usuario es un profesor o instructor, el modo debe ser "instructor".
- El nombre debe inferirse como el nombre completo de la persona mencionada.
- La descripción debe inferirse como el nombre de la clase o producto mencionado.

Ejemplo:
Entrada: "Agregar a valentin romero a la clase de latino con un descuento del 30%"
Respuesta:
{
  "user": {
    "name": "valentin romero",
    "customId": null
  },
  "product": {
    "description": "latino",
    "customId": null
  },
  "discount": 30,
  "mode": "assistant"
}

Entrada: ${message}
Respuesta:
`.trim();
}
