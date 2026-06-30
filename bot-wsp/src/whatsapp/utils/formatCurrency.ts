// Formatea valores ARS sin decimales “feos”
export const formatCurrency = (value?: number) =>
    typeof value === "number"
        ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value)
        : "—";
