import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for updating an existing message.
 * Only content can be changed - sender, receiver, and replyTo are immutable.
 */
export class UpdateMessageDto {
  /** Updated message content (max 5000 characters) */
  @ApiProperty({
    description: 'Updated message content',
    example: 'Edited: Hey Bob, how are you doing?',
    maxLength: 5000,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  content?: string;
}
