import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { RfidService } from './rfid.service';

@Controller('rfid')
// TODO ponerle un token estatico a los lectores RFID ? 
// @UseGuards(AuthTokenGuard)
export class RfidController {
  constructor(private readonly rfidService: RfidService) { }


  @Post('ping')
  @HttpCode(200)
  @Header('Content-Type', 'text/plain')
  async ping(@Body('id') uid: string): Promise<string> {
    console.log(`RFID ping recibido con id=${uid}`);
    await this.rfidService.ping(uid);
    return 'ok'
  }
}
