import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '@psychology/types';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@psychology/types';

interface CachedUserValidation {
  currentUser: CurrentUser;
  credentialVersion: number;
  isActive: boolean;
  expiresAt: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly userCache = new Map<string, CachedUserValidation>();

  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['access_token'];
          }
          if (!token && request.headers.authorization) {
            const parts = request.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
              token = parts[1];
            }
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    role: UserRole;
    credentialVersion: number;
  }): Promise<CurrentUser> {
    const now = Date.now();
    const cached = this.userCache.get(payload.sub);
    if (cached && now < cached.expiresAt) {
      if (
        !cached.isActive ||
        cached.credentialVersion !== payload.credentialVersion ||
        (cached.currentUser.role !== UserRole.STAFF && cached.currentUser.role !== UserRole.ADMIN)
      ) {
        this.userCache.delete(payload.sub);
        throw new UnauthorizedException('Seans tugadi. Qayta kiring.');
      }
      return cached.currentUser;
    }

    const user = await this.usersService.findById(payload.sub);
    if (
      !user ||
      !user.isActive ||
      user.credentialVersion !== payload.credentialVersion ||
      (user.role !== UserRole.STAFF && user.role !== UserRole.ADMIN)
    ) {
      this.userCache.delete(payload.sub);
      throw new UnauthorizedException('Seans tugadi. Qayta kiring.');
    }

    const currentUser: CurrentUser = {
      id: user.id,
      telegramId: user.telegramId,
      email: user.email,
      role: user.role,
      staffRoleId: user.staffRoleId,
      displayName: user.displayName,
      studentIdentifier: user.studentIdentifier,
    };

    this.userCache.set(payload.sub, {
      currentUser,
      credentialVersion: user.credentialVersion,
      isActive: user.isActive,
      expiresAt: now + 30_000,
    });

    return currentUser;
  }
}
