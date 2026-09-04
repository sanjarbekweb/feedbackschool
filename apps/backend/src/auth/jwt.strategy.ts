import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '@psychology/types';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@psychology/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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
    const user = await this.usersService.findById(payload.sub);
    if (
      !user ||
      !user.isActive ||
      user.credentialVersion !== payload.credentialVersion ||
      (user.role !== UserRole.STAFF && user.role !== UserRole.ADMIN)
    ) {
      throw new UnauthorizedException('User no longer exists or session expired.');
    }
    return {
      id: user.id,
      telegramId: user.telegramId,
      email: user.email,
      role: user.role,
      studentIdentifier: user.studentIdentifier,
    };
  }
}
