
import { AuthService } from '../../../auth/auth.service';
import { registerUserMenu } from './menu/userMenu';
import { UserService } from '../../../user/user.service';
import { SessionsService } from '../../../sessions/sessions.service';
import { InvoicesService } from '../../../invoices/invoices.service';
import { registerViewNewKeysFlow } from './flows/viewNewKeysFlowFlow';

import { registerViewPaymentStatusFlow } from './flows/viewPaymentStatusFlow';
import { registerEnrolledNewClassesFlow } from './flows/enrolledNewClassesFlow';
import { registerViewEnrolledClassesFlow } from './flows/viewEnrolledClassesFlow';
import { SubscriptionsService } from '../../../subscriptions/subscriptions.service';


//NOTE Flujo de conversacion para usuarios

export const getUserFlows = ({
    userService,
    authService,
    invoicesService,
    sessionService,
    subscriptionsService
}: {
    userService: UserService;
    invoicesService: InvoicesService;
    sessionService: SessionsService;
    authService: AuthService;
    subscriptionsService: SubscriptionsService;
}) => {
    const enrollNewClassesFlow = registerEnrolledNewClassesFlow({ sessionService: sessionService, subscriptionsService: subscriptionsService });
    const viewNewKeysFlow = registerViewNewKeysFlow({ sessionService: sessionService, userService: userService , enrollNewClassesFlow: enrollNewClassesFlow });
    const viewEnrolledClassesFlow = registerViewEnrolledClassesFlow({ sessionService: sessionService, userService: userService });
    const viewPaymentStatusFlow = registerViewPaymentStatusFlow({ sessionService: sessionService, userService: userService , invoicesService: invoicesService });


    const userMenu = registerUserMenu({
        authService: authService,
        userService: userService,
        invoicesService: invoicesService,
        viewPaymentStatusFlow: viewPaymentStatusFlow,
        viewEnrolledClassesFlow: viewEnrolledClassesFlow,
        viewNewKeysFlow: viewNewKeysFlow,
        enrollNewClassesFlow: enrollNewClassesFlow,
    })

    return {
        flows: [viewNewKeysFlow, viewPaymentStatusFlow, viewEnrolledClassesFlow, enrollNewClassesFlow, userMenu],
        references: { userMenu }
    };
};
