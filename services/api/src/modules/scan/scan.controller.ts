import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ScanService } from './scan.service';

@Controller('scan')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Get(':code')
  @Roles('admin', 'operator', 'shipper')
  lookup(@Param('code') code: string) {
    return this.scanService.lookup(code);
  }
}
