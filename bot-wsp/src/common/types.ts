// common/types.ts
import { UserRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  role: UserRole;
  name?: string;
  customId?: string;
};

// typings/express.d.ts  (asegurate que el tsconfig incluya este archivo)
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
