import { User, UserRole } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

// Define the UserFilter type
export type UserFilter = {
  nombre?: string;
  birthdayMonth?: number;
};

export type UserDataUpdate = Pick<User, 'name' | 'phone' | 'birth' | 'customId'>

export class UpsertUserDto {
  @IsOptional()
  @IsString()
  id?: string; // si viene, actualizamos

  @IsString()
  customId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birth?: string;

  @IsOptional()
  @IsString()
  rfid?: string;

  @IsOptional()
  @IsDateString()
  deleted?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}


