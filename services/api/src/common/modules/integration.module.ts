import { Global, Module } from '@nestjs/common';
import { IntegrationService } from '../services/integration.service';

@Global()
@Module({
  providers: [IntegrationService],
  exports: [IntegrationService]
})
export class IntegrationModule {}