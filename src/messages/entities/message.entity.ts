import { ApiProperty } from '@nestjs/swagger';

/**
 * Message entity representing the API response shape.
 * Decoupled from Prisma model for better API versioning and response control.
 */
export class MessageEntity {
  /** Unique message identifier */
  @ApiProperty({
    description: 'Unique message identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id: string;

  /** Message content */
  @ApiProperty({
    description: 'Message content',
    example: 'Hey Bob, how are you?',
  })
  content: string;

  /** UUID of the sender */
  @ApiProperty({
    description: 'UUID of the user who sent the message',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  senderId: string;

  /** UUID of the receiver */
  @ApiProperty({
    description: 'UUID of the user who received the message',
    example: '550e8400-e29b-41d4-a716-446655440002',
    format: 'uuid',
  })
  receiverId: string;

  /** UUID of the parent message if this is a reply, null otherwise */
  @ApiProperty({
    description: 'UUID of the parent message if this is a reply, null otherwise',
    example: '550e8400-e29b-41d4-a716-446655440003',
    format: 'uuid',
    nullable: true,
  })
  replyToId: string | null;

  /** Timestamp when the message was created */
  @ApiProperty({
    description: 'Timestamp when the message was created',
    example: '2025-11-04T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  /** Timestamp when the message was last updated */
  @ApiProperty({
    description: 'Timestamp when the message was last updated',
    example: '2025-11-04T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;

  constructor(partial: Partial<MessageEntity>) {
    Object.assign(this, partial);
  }
}
