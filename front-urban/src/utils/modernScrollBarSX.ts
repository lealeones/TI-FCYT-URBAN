export const modernScrollbarSX = {
    maxHeight: '70vh',
    overflowY: 'auto',
    scrollbarGutter: 'stable',        // evita saltos de layout
    scrollbarWidth: 'thin',           // Firefox
    scrollbarColor: 'rgba(197,171,255,0.65) rgba(255,255,255,0.06)',

    /* Chrome/Edge/Safari */
    '&::-webkit-scrollbar': {
        width: 10,
    },
    '&::-webkit-scrollbar-track': {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.06)',
    },
    '&::-webkit-scrollbar-thumb': {
        borderRadius: 999,
        background:
            'linear-gradient(180deg, var(--mui-palette-primary-main), rgba(197,171,255,0.9))',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
    },
    '&::-webkit-scrollbar-thumb:hover': {
        background:
            'linear-gradient(180deg, var(--mui-palette-primary-light), rgba(197,171,255,1))',
    },
};
