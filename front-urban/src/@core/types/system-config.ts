export type SystemConfig = {
    id: string;
    sessionCleanupIntervalMinutes: number;
    invoiceGenerationDayOfMonth: number;
    tokenExpirationMinutes: number;
    tokenCleanupIntervalMinutes: number;
    profilePictureUpdateIntervalDays: number;
    createdAt: string;
    updatedAt: string;
};

export type UpdateSystemConfigDto = {
    sessionCleanupIntervalMinutes?: number;
    invoiceGenerationDayOfMonth?: number;
    tokenExpirationMinutes?: number;
    tokenCleanupIntervalMinutes?: number;
    profilePictureUpdateIntervalDays?: number;
};
