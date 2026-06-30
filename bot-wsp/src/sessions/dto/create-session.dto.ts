import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  ValidateNested,
  IsObject,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionType } from '@prisma/client';

export enum ClaseTipo {
  RECURRING = 'RECURRING',
  ONE_TIME = 'ONE_TIME',
}

class ProfesorDto {
  @IsString()
  customId!: string;
}

class DateRangeDto {
  @IsDateString()
  start!: string;

  @IsDateString()
  end!: string;
}

export class CreateClaseDto {
  @IsString()
  title!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ProfesorDto)
  profesor!: ProfesorDto;

  @IsEnum(ClaseTipo)
  type!: ClaseTipo;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  days?: string[] | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateRangeDto)
  dates!: DateRangeDto[];

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}


export class UpsertClaseDto {
  @IsOptional()
  @IsString()
  id?: string; // si viene, edita; si no, crea

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(SessionType)
  type!: SessionType;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @ValidateNested()
  @Type(() => ProfesorDto)
  profesor!: ProfesorDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateRangeDto)
  dates!: DateRangeDto[];

  @IsNumber()
  amount: number | undefined
}

export class SetParticipantsDto {
  @IsArray()
  @IsString({ each: true })
  userIds!: string[]; // IDs finales seleccionados
}