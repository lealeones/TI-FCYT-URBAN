export type UserRole = 'ADMIN' | 'INSTRUCTOR' | 'USER' | 'GUEST';
export type Usuario = {
    id?: string;
    customId: string;
    name: string;
    dni?: string | null;
    phone?: string | null;
    birth?: string | null;
    rfid?: string | null;
    role?: UserRole;
    deleted?: Date | string | null;
};
