import { Body, Controller, Header, Post } from '@nestjs/common';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { SupportService } from './support.service';

class SupportQueryDto {
  @IsEmail()
  customerEmail!: string;

  @IsString()
  query!: string;
}

class WhatsAppMessageDto {
  @IsString()
  From!: string;

  @IsString()
  Body!: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;
}

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('query')
  query(@Body() dto: SupportQueryDto) {
    return this.supportService.answerQuery(dto);
  }

  @Post('whatsapp/message-webhook')
  @Header('Content-Type', 'text/xml')
  async whatsappMessage(@Body() dto: WhatsAppMessageDto) {
    const result = await this.supportService.handleWhatsAppMessage({
      from: dto.From,
      body: dto.Body,
      customerEmail: dto.customerEmail
    });
    return result.twiml;
  }

  @Post('whatsapp/voice-webhook')
  @Header('Content-Type', 'text/xml')
  whatsappVoice() {
    return this.supportService.handleWhatsAppVoice().twiml;
  }
}
