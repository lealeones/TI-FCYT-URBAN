import { PartialType } from '@nestjs/mapped-types';
import { CreateRfidDto } from './create-rfid.dto';

export class UpdateRfidDto extends PartialType(CreateRfidDto) {}
