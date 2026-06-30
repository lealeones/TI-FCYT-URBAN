import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
// import { IaService } from './ia.service';
import { CreateIaDto } from './dto/create-ia.dto';
import { UpdateIaDto } from './dto/update-ia.dto';

@Controller('ia')
export class IaController {
  constructor() {}

  // @Post()
  // create(@Body() createIaDto: CreateIaDto) {
  //   return this.iaService.create(createIaDto);
  // }

  // @Get()
  // findAll() {
  //   return this.iaService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.iaService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateIaDto: UpdateIaDto) {
  //   return this.iaService.update(+id, updateIaDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.iaService.remove(+id);
  // }
}
