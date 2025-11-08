import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * User service handling user data operations and account management.
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get user by ID (excluding soft-deleted users).
   * @param userId - User UUID
   * @returns User profile data
   * @throws NotFoundException if user not found or deleted
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  /**
   * Soft delete user account and anonymize data.
   * Users can only delete their own account.
   * Message history is preserved with user snapshots.
   * @param userId - User ID to delete
   * @param requestingUserId - ID of user making the request
   * @returns Deletion confirmation message
   * @throws ForbiddenException if trying to delete another user's account
   * @throws NotFoundException if user not found
   */
  async deleteAccount(userId: string, requestingUserId: string) {
    // Only allow users to delete their own account
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You can only delete your own account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isDeleted: true },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Soft delete: mark as deleted and anonymize sensitive data
    // Messages remain intact with user info snapshot (senderName, receiverName, etc.)
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        isDeleted: true,
        deletedAt: new Date(),
        name: 'Deleted User',
        email: `deleted_${userId}@deleted.com`,
        phoneNumber: `+0000000${userId.slice(-4)}`,
        refreshToken: null, // Invalidate refresh token
      },
    });

    return { message: 'Account successfully deleted. Your message history has been preserved.' };
  }

  /**
   * Get all users (privileged endpoint - requires API key)
   * Returns all users including soft-deleted ones
   */
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
