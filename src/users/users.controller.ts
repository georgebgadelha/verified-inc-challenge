import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';

/**
 * User management controller handling profile and account operations.
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get all users in the system (privileged endpoint).
   * @requires API Key header (X-API-Key)
   * @returns List of all users including soft-deleted ones
   */
  @Get()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('X-API-Key')
  @ApiOperation({ 
    summary: 'Get all users (privileged)', 
    description: 'Fetch all users including deleted ones. Requires X-API-Key header with valid admin API key.' 
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing API key' })
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  /**
   * Get authenticated user's profile.
   * @param req - Request with authenticated user
   * @returns User profile data
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyProfile(@Request() req) {
    return this.usersService.getUserById(req.user.id);
  }

  /**
   * Delete user account (soft delete).
   * Users can only delete their own account.
   * @param id - User ID to delete
   * @param req - Request with authenticated user
   * @returns Deletion confirmation message
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user account (own account only)' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 403, description: 'Can only delete own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@Param('id') id: string, @Request() req) {
    return this.usersService.deleteAccount(id, req.user.id);
  }
}
