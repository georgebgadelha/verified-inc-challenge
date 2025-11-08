import { ApiProperty } from '@nestjs/swagger';
import { MessageEntity } from '../entities/message.entity';

/**
 * Cursor-based pagination metadata.
 * Provides consistent results even when data is being added/removed in real-time.
 */
export class CursorPaginationMeta {
  /** Number of items in the current response */
  @ApiProperty({
    description: 'Number of items returned',
    example: 20,
  })
  count: number;

  /** Number of items requested per page */
  @ApiProperty({
    description: 'Number of items requested per page',
    example: 20,
  })
  limit: number;

  /** Cursor for the next page (null if no more results) */
  @ApiProperty({
    description: 'Cursor to fetch the next page (use as cursor parameter in next request)',
    example: '2023-11-07T12:34:56.789Z_abc123',
    nullable: true,
  })
  nextCursor: string | null;

  /** Cursor for the previous page (null if this is the first page) */
  @ApiProperty({
    description: 'Cursor to fetch the previous page (use as cursor parameter with reverse sort)',
    example: '2023-11-07T12:00:00.000Z_xyz789',
    nullable: true,
  })
  prevCursor: string | null;

  /** Whether there are more results available */
  @ApiProperty({
    description: 'Whether there are more results after this page',
    example: true,
  })
  hasMore: boolean;
}

/**
 * Cursor-based paginated response for messages.
 * Uses message timestamp + ID as cursor for consistent pagination.
 */
export class PaginatedMessagesDto {
  /** Array of messages for the current page */
  @ApiProperty({
    description: 'Array of messages for the current page',
    type: [MessageEntity],
  })
  data: MessageEntity[];

  /** Cursor pagination metadata */
  @ApiProperty({
    description: 'Cursor pagination metadata',
    type: CursorPaginationMeta,
  })
  meta: CursorPaginationMeta;
}
