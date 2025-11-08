import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Guard to protect privileged endpoints with API key authentication.
 * Checks for X-API-Key header against configured ADMIN_API_KEY environment variable.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  /**
   * Validate API key from request headers.
   * @param context - Execution context containing request
   * @returns true if valid API key provided
   * @throws UnauthorizedException if API key missing or invalid
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    const validApiKey = process.env.ADMIN_API_KEY;

    if (!validApiKey) {
      throw new UnauthorizedException('Admin API key not configured');
    }

    if (!apiKey || apiKey !== validApiKey) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}
