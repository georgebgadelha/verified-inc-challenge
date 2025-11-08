import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for refreshing access tokens.
 * Contains the refresh token obtained from login or registration.
 */
export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token received from login or register',
  })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
