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

  /** UUID of the sender (null if user was deleted) */
  @ApiProperty({
    description: 'UUID of the user who sent the message (null if user was deleted)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
    nullable: true,
  })
  senderId: string | null;

  /** UUID of the receiver (null if user was deleted or if group message) */
  @ApiProperty({
    description: 'UUID of the user who received the message (null if user was deleted or if group message)',
    example: '550e8400-e29b-41d4-a716-446655440002',
    format: 'uuid',
    nullable: true,
  })
  receiverId: string | null;

  /** UUID of the group (null if direct message) */
  @ApiProperty({
    description: 'UUID of the group (null if direct message)',
    example: '550e8400-e29b-41d4-a716-446655440003',
    format: 'uuid',
    nullable: true,
  })
  groupId: string | null;

  /** Name of the sender at time of message creation */
  @ApiProperty({
    description: 'Name of the sender (preserved even if user deleted)',
    example: 'Alice',
  })
  senderName: string;

  /** Phone of the sender at time of message creation */
  @ApiProperty({
    description: 'Phone number of the sender (preserved even if user deleted)',
    example: '+1234567890',
  })
  senderPhone: string;

  /** Name of the receiver at time of message creation (null for group messages) */
  @ApiProperty({
    description: 'Name of the receiver (preserved even if user deleted, null for group messages)',
    example: 'Bob',
    nullable: true,
  })
  receiverName: string | null;

  /** Phone of the receiver at time of message creation (null for group messages) */
  @ApiProperty({
    description: 'Phone number of the receiver (preserved even if user deleted, null for group messages)',
    example: '+0987654321',
    nullable: true,
  })
  receiverPhone: string | null;

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
