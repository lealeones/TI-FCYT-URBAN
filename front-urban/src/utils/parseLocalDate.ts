export function parseLocalDate(yyyyMmDd: string) {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    return new Date(y, m - 1, d); // medianoche local
}
