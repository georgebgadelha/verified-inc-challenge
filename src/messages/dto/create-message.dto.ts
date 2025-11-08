import { IsString, IsNotEmpty, IsUUID, IsOptional, MaxLength, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new message.
 * Supports both direct messages (1-on-1) and group messages.
 * For direct messages: provide receiverId
 * For group messages: provide groupId
 * senderId is automatically set from authenticated user
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

  /** UUID of the user receiving the message (for direct messages only) */
  @ApiProperty({
    description: 'UUID of the user receiving the message (required for direct messages)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
    required: false,
  })
  @ValidateIf((o) => !o.groupId)
  @IsUUID()
  @IsNotEmpty()
  receiverId?: string;

  /** UUID of the group (for group messages only) */
  @ApiProperty({
    description: 'UUID of the group (required for group messages)',
    example: '550e8400-e29b-41d4-a716-446655440002',
    format: 'uuid',
    required: false,
  })
  @ValidateIf((o) => !o.receiverId)
  @IsUUID()
  @IsNotEmpty()
  groupId?: string;

  /** Optional UUID of the message being replied to (for threaded conversations) */
  @ApiProperty({
    description: 'Optional UUID of the message being replied to (for threaded conversations)',
    example: '550e8400-e29b-41d4-a716-446655440003',
    format: 'uuid',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  replyToId?: string;
}
