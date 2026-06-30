import { IsNumberString, IsString, Matches } from 'class-validator';

export class InvoicesByMonthQueryDto {
  @IsNumberString()
  @Matches(/^(0[1-9]|1[0-2])$/, {
    message: 'month debe ser un número entre 01 y 12'
  })
  month!: string;

  @IsNumberString()
  @Matches(/^\d{4}$/, {
    message: 'year debe ser un año de 4 dígitos'
  })
  year!: string;
}
