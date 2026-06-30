// src/whatsapp/flows/admin/adminFlows.ts
import { registerCreateSessionFlow } from './session/createSessionFlow';
import { SessionsService } from '../../../sessions/sessions.service';
import { UserService } from '../../../user/user.service';
// import { IaService } from '../../../ia/ia.service';
import { registerListSessionFlow } from './session/listSessionFlow';
import { registerListUserFlow } from './user/listUserFlow';
import { registerUserFlow } from './user/userFlow';
import { registerAdminMenu } from './menu/adminMenu';
import { registerSessionFlow } from './session/sessionFlow';
import { registerCreateSubscriptionFlow } from '../subscription/createSubscriptionFlow';
import { IaSubscriptionService } from '../../../ia/services/ia.subscription.service';
import { registerUpdateUserFlow } from './user/updateUserFlow';
import { registeDeleteUserFlow } from './user/deleteUser';
import { registerModifyUser } from './user/modifyUser';
import { AuthService } from '../../../auth/auth.service';

export const getAdminFlows = ({
  userService,
  sessionService,
  iaService,
  iaSubscription,
  authService,
}: {
  userService: UserService;
  sessionService: SessionsService;
  iaService: any;
  iaSubscription: IaSubscriptionService;
  authService: AuthService
}) => {
  const subscriptionFlow = registerCreateSubscriptionFlow({ iaService: iaSubscription });
  //Session 
  const createSession = registerCreateSessionFlow({ iaService, sessionService });
  const listSession = registerListSessionFlow({ sessionService, iaService });
  //user
  const updateUser = registerUpdateUserFlow({ userService, iaService });
  const deleteUser = registeDeleteUserFlow({ userService, iaService });
  const listUser = registerListUserFlow({ iaService, userService });
  const modifyUser = registerModifyUser({ deleteUser, updateUser });

  //flows
  const sessionFlow = registerSessionFlow({ sessionService, createSessionFlow: createSession, listSession, });
  const userFlow = registerUserFlow({ listUser, modifyUser });
  //main menu
  const adminMenu = registerAdminMenu({ authService, userService })
  return {
    flows: [userFlow, modifyUser, createSession, deleteUser, updateUser, sessionFlow, listSession, listUser, adminMenu, subscriptionFlow],
    references: { userFlow, modifyUser, createSession, sessionFlow, listSession, listUser, adminMenu, subscriptionFlow, deleteUser }
  };
};
