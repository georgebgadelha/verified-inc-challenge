import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * Authentication service handling user registration, login, and token management.
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Register a new user account.
   * @param registerDto - User registration data
   * @returns Access token, refresh token, and user profile
   * @throws ConflictException if email or phone already exists
   */
  async register(registerDto: RegisterDto) {
    const { email, password, name, phoneNumber } = registerDto;

    // Check if user already exists by email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, isDeleted: true },
    });

    if (existingUserByEmail && !existingUserByEmail.isDeleted) {
      throw new ConflictException('Email already in use');
    }

    // Check if phone number already exists
    const existingUserByPhone = await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true, phoneNumber: true, isDeleted: true },
    });

    if (existingUserByPhone && !existingUserByPhone.isDeleted) {
      throw new ConflictException('Phone number already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user first to get ID
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phoneNumber,
      },
    });

    // Generate tokens with correct user ID (only once)
    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // Update user with refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Authenticate user with email and password.
   * @param loginDto - Login credentials (email and password)
   * @returns Access token, refresh token, and user profile
   * @throws UnauthorizedException if credentials invalid or user deleted
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email (unique field)
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        password: true, // Needed for bcrypt verification
        isDeleted: true,
        createdAt: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate new tokens
    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // Update refresh token in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Generate new access token using valid refresh token.
   * Implements refresh token rotation for enhanced security.
   * @param refreshToken - Refresh token from previous authentication
   * @returns New access token and new refresh token
   * @throws UnauthorizedException if refresh token invalid or expired
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      });

      // Find user by ID (unique field)
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          refreshToken: true, // Needed for comparison
          isDeleted: true,
        },
      });

      if (!user || user.isDeleted || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify stored refresh token matches
      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens (refresh token rotation)
      const newAccessToken = this.generateAccessToken(user.id, user.email);
      const newRefreshToken = this.generateRefreshToken(user.id);
      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

      // Update refresh token in database
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefreshToken },
      });

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Validate user exists and is not deleted (used by JWT strategy).
   * @param userId - User UUID to validate
   * @returns User profile data
   * @throws UnauthorizedException if user not found or deleted
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Generate short-lived access token (15 minutes).
   * @param userId - User UUID
   * @param email - User email
   * @returns Signed JWT access token
   */
  private generateAccessToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload, {
      expiresIn: '15m', // Short-lived access token
    });
  }

  /**
   * Generate long-lived refresh token (7 days).
   * @param userId - User UUID
   * @returns Signed JWT refresh token
   */
  private generateRefreshToken(userId: string): string {
    const payload = { sub: userId };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      expiresIn: '7d', // Long-lived refresh token
    });
  }
}
