import { Body, Controller, Get, Param, Post, Put, Query, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service.js';
import { User as UserModel, UserRole } from '@prisma/client';
import { UpsertUserDto } from './user.dto.js';
import { AuthTokenGuard } from '~/common/guards/auth-token.guard';
import { User } from '~/common/decoratos/user.decorator';
import { AuthUser } from '~/common/types';


@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get()
  async getUsers(): Promise<UserModel[]> {
    console.log('=== GET /users endpoint called ===');
    const users = await this.userService.findAll();
    console.log(`Found ${users.length} users`);
    return users;
  }

  @Get('instructor')
  async getProfesors(): Promise<UserModel[]> {
    return await this.userService.findAllProfesors();
  }

  @UseGuards(AuthTokenGuard)
  @Get(':userId/profile-picture')
  async getProfilePicture(
    @Param('userId') userId: string,
    @User() user: AuthUser
  ): Promise<{ profilePicture: string | null; updatedAt: Date | null }> {
    // Verificar permisos - debe ser admin, instructor o el mismo usuario
    const allowed = user?.role === UserRole.ADMIN || 
                   user?.role === UserRole.INSTRUCTOR || 
                   user?.id === userId;
    
    if (!allowed) {
      throw new ForbiddenException('No tienes permisos para ver esta foto de perfil');
    }

    const foundUser = await this.userService.findById(userId);
    
    if (!foundUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      profilePicture: foundUser.profilePicture || null,
      updatedAt: foundUser.profilePictureUpdatedAt || null
    };
  }

  @Post()
  async upsertUser(@Body() body: UpsertUserDto) {
    return this.userService.upsert(body);
  }

  @Put(':userId/active')
  async toogleActivateUser(
    @Body() body: { deleted: Date | null },
    @Param('userId') userId: string
  ) {
    return this.userService.toogleActivateUser(userId, body);
  }

}