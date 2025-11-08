import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT authentication guard using Passport JWT strategy.
 * Validates Bearer token and attaches user to request.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
