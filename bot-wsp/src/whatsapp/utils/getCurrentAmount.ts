/**
 * Obtiene el precio vigente de una sesión para una fecha específica
 * @param clase Objeto sesión con priceHistories
 * @param targetDate Fecha para la cual se quiere el precio (opcional, por defecto es ahora)
 * @returns Precio vigente para la fecha especificada
 */
export const getCurrentAmount = (clase: any, targetDate?: Date): number | undefined => {
    const target = targetDate || new Date();
    
    // Si no hay historial de precios, usar el amount de la sesión
    if (!Array.isArray(clase?.priceHistories) || clase.priceHistories.length === 0) {
        return clase?.amount;
    }

    // Ordenar por fecha de inicio (más reciente primero)
    const sortedHistory = clase.priceHistories
        .sort((a: any, b: any) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

    // Buscar el precio aplicable para la fecha objetivo
    const applicablePrice = sortedHistory.find((p: any) => {
        const from = new Date(p.effectiveFrom);
        const to = p.effectiveTo ? new Date(p.effectiveTo) : null;
        
        // Si es el precio vigente (effectiveTo = null) y la fecha es posterior al inicio
        if (!to && from <= target) {
            return true;
        }
        
        // Si tiene fecha de fin, verificar que esté en el rango
        if (to && from <= target && target < to) {
            return true;
        }
        
        return false;
    });

    return applicablePrice?.amount || clase?.amount;
};