import { getInstructorName } from "./getInstructorName";
import { buildSchedule } from "./buildSchedule";
import { getCurrentAmount } from "./getCurrentAmount";
import { formatCurrency } from "./formatCurrency";

export const buildClaseMessage = (clase: any): string => {
    const profe = getInstructorName(clase);
    const horarios = buildSchedule(clase);
    const montoStr = formatCurrency(getCurrentAmount(clase));

    return [
        `*${clase.customId}. ${clase.description}*`,
        `👨‍🏫 *Profesor:* ${profe}`,
        `🗓️ *Días/horarios:* ${horarios}`,
        `💵 *Monto:* ${montoStr}`,
    ].join("\n");
};
