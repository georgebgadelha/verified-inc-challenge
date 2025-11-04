import { IsString, IsNotEmpty, IsUUID, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new message.
 * Validates incoming data when sending a new message or replying to an existing one.
 */
export class CreateMessageDto {
  /** Message content (max 5000 characters) */
  @ApiProperty({
    description: 'Message content',
    example: 'Hey Bob, how are you?',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  /** UUID of the user sending the message */
  @ApiProperty({
    description: 'UUID of the user sending the message',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  senderId: string;

  /** UUID of the user receiving the message */
  @ApiProperty({
    description: 'UUID of the user receiving the message',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  receiverId: string;

  /** Optional UUID of the message being replied to (for threaded conversations) */
  @ApiProperty({
    description: 'Optional UUID of the message being replied to (for threaded conversations)',
    example: '550e8400-e29b-41d4-a716-446655440002',
    format: 'uuid',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  replyToId?: string;
}
