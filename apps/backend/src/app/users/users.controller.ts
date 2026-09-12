import { Controller, Get } from '@nestjs/common';
import type { User } from '@org/shared-types';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }
}
