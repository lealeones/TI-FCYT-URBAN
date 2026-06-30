type ParsedUser = {
  customId: string;
  name: string;
  phone: string | null;
  birth: Date | null;
};

export const validateUserInput = (input: string): { errors: string[]; data?: ParsedUser } => {
  const errors: string[] = [];

  // 1) ID al inicio: U-XXX (letras o números)
  const idMatch = input.match(/^U-[A-Za-z0-9]{3}/);
  const customId = idMatch?.[0] ?? '';
  if (!customId) {
    errors.push('ID inválido. Debe comenzar con U- seguido de 3 letras o dígitos.');
  }

  // 2) El resto del string sin el ID
  const restAfterId = input.slice(customId.length).trim();

  // 3) Fecha al final: dd/mm/yyyy
  const birthMatch = restAfterId.match(/(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/);
  const birthStr = birthMatch?.[0] ?? '';
  if (!birthStr) {
    errors.push('Fecha de nacimiento inválida. Formato requerido: dd/mm/yyyy.');
  }

  // 4) Resto sin la fecha
  const restWithoutBirth = birthStr
    ? restAfterId.slice(0, restAfterId.length - birthStr.length).trim()
    : restAfterId;

  // 5) Teléfono al final: 7 a 15 dígitos
  const phoneMatch = restWithoutBirth.match(/\d{7,15}$/);
  const phone = phoneMatch?.[0] ?? null;
  if (!phone) {
    errors.push('Teléfono inválido. Debe tener entre 7 y 15 dígitos.');
  }

  // 6) Nombre = lo que queda
  const name = phone
    ? restWithoutBirth.slice(0, restWithoutBirth.length - phone.length).trim()
    : restWithoutBirth.trim();

  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/.test(name) || name.length === 0) {
    errors.push('Nombre inválido. Solo se permiten letras y espacios.');
  }

  // 7) Convertir fecha a objeto Date
  let birth: Date | null = null;
  if (birthStr) {
    const [day, month, year] = birthStr.split('/');
    birth = new Date(`${year}-${month}-${day}`);
    if (isNaN(birth.getTime())) {
      errors.push('Fecha de nacimiento inválida.');
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    data: {
      customId,
      name,
      phone,
      birth,
    },
  };
};
