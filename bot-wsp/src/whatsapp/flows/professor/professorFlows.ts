
import { AuthService } from '../../../auth/auth.service';
import { UserService } from '../../../user/user.service';
import { registerProfessorMenu } from './menu/professorMenu';


//NOTE Flujo de conversacion para profesores

export const getProfessorFlows = ({
    userService,
    authService,
}: {
    userService: UserService;
    authService: AuthService;
}) => {

    const professorMenu = registerProfessorMenu({
        authService: authService,
        userService: userService,
    })

    return {
        flows: [professorMenu],
        references: { professorMenu }
    };
};
