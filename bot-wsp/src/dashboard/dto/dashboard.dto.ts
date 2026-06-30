export type DashboardUser = {
  message: string;
  accessLog: {
    currentAccess: string;
    lastAccess: string;
  },
  cardDetails: {
    sessions: {
      total: number;
      active: number;
      inactive: number;
    };
    users: {
      total: number;
      active: number;
      inactive: number;
    };
    assistants: number; // total de usuarios inscriptos a clases activas
    invoices: {
      total: number;   // total de facturas del mes actual
      paid: number;    // facturas pagadas (PAID o CANCELED)
      pending: number; // facturas adeudadas (PENDING)
    };
    revenue: number;
  },
  sessions: {
    id: string;
    description: string;
    instructors: string;
    startDate: string;
  }[]
} 