import { Test, TestingModule } from '@nestjs/testing';
import { OdooService } from './odoo.service';

describe('OdooService', () => {
  let service: OdooService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OdooService],
    }).compile();

    service = module.get<OdooService>(OdooService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
