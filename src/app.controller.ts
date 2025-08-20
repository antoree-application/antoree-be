import {
  Controller,
  Get,
  Post,
  Render,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth/auth.service';
import { Public } from './decorators/public.decorator';
import { LocalAuthGuard } from './auth/local-auth.guard';

@Controller('init')
export class AppController {
  constructor() {}

  @Get()
  @Public()
  @Render('index')
  async index() {
    return { message: 'Create seed data success !!!!' };
  }
}
