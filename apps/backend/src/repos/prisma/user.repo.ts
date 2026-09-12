import { Injectable } from '@nestjs/common';
import type { User } from '@org/shared-types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UserRepo } from '../user.port.js';

function toDomain(row: { id: string; name: string; role: string; farmIds: string[] }): User {
  return { id: row.id, name: row.name, role: row.role as User['role'], farmIds: row.farmIds };
}

@Injectable()
export class PrismaUserRepo implements UserRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }
}
