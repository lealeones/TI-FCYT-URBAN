export const buildPromptInferAction = (message: string): string => {
    return `
Eres un asistente que clasifica la intención de un usuario.

Analiza el siguiente mensaje y devuelve solo una de las siguientes claves JSON válidas según la intención detectada:
- "create_session" si el usuario quiere crear una sesión, agendar, programar, registrar una clase o similar.
- "update_user" si el usuario quiere actualizar personales, cambiar nombre, cambiar teléfono, modificar información de usuario.
- "get_sessions" si el usuario quiere ver las sesiones, clases, horarios, agenda, calendario o similar.
- "get_users" si el usuario quiere ver o listar usuarios, personas, alumnos, estudiantes o similar.

Solo responde la clave exacta sin agregar texto adicional.

Ejemplo:
Entrada: "Quiero crear una nueva clase para mañana"
Respuesta: "create_session"

Entrada: "Necesito actualizar el telefono del usuario U-001"
Respuesta: "update_user"

Entrada: "Quiero ver las clases para mañana"
Respuesta: "get_sessions"

Entrada: ${message}

Respuesta:
`.trim();
}
