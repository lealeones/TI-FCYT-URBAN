import { Test, TestingModule } from '@nestjs/testing';
import { CustomIdService } from './custom-id.service';

describe('CustomIdService', () => {
  let service: CustomIdService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomIdService],
    }).compile();

    service = module.get<CustomIdService>(CustomIdService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
