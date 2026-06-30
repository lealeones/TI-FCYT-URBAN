import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomIdDto } from './create-custom-id.dto';

export class UpdateCustomIdDto extends PartialType(CreateCustomIdDto) {}
