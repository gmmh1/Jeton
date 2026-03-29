import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { randomUUID } from 'crypto';

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'shipper' | 'operator';
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly users: UserRecord[] = [];

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  onModuleInit() {
    const email = (this.configService.get<string>('SUPERUSER_EMAIL') || '').trim().toLowerCase();
    const passwordHash = (this.configService.get<string>('SUPERUSER_PASSWORD_HASH') || '').trim();
    const role = (this.configService.get<string>('SUPERUSER_ROLE') || 'admin') as UserRecord['role'];

    if (!email || !passwordHash) {
      return;
    }

    if (this.users.some((user) => user.email === email)) {
      return;
    }

    this.users.push({
      id: randomUUID(),
      email,
      passwordHash,
      role
    });
  }

  async register(email: string, password: string, role: UserRecord['role']) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = this.users.find((entry) => entry.email === normalizedEmail);
    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        role: existing.role
      };
    }

    const passwordHash = await hash(password, 10);
    const user: UserRecord = {
      id: randomUUID(),
      email: normalizedEmail,
      passwordHash,
      role
    };
    this.users.push(user);
    return {
      id: user.id,
      email: user.email,
      role: user.role
    };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.users.find((entry) => entry.email === normalizedEmail);
    if (!user) {
      return { error: 'Invalid credentials' };
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return { error: 'Invalid credentials' };
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    return {
      accessToken,
      role: user.role
    };
  }
}
