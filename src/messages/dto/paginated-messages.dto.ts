import { ApiProperty } from '@nestjs/swagger';
import { MessageEntity } from '../entities/message.entity';

/**
 * Metadata for paginated results.
 */
export class PaginationMeta {
  /** Current page number (1-based) */
  @ApiProperty({
    description: 'Current page number (1-based)',
    example: 1,
  })
  currentPage: number;

  /** Number of items per page */
  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  pageSize: number;

  /** Total number of items across all pages */
  @ApiProperty({
    description: 'Total number of items',
    example: 47,
  })
  totalItems: number;

  /** Total number of pages */
  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;

  /** Whether there is a next page */
  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage: boolean;

  /** Whether there is a previous page */
  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPreviousPage: boolean;

  /** Next page number (null if no next page) */
  @ApiProperty({
    description: 'Next page number (null if last page)',
    example: 2,
    nullable: true,
  })
  nextPage: number | null;

  /** Previous page number (null if no previous page) */
  @ApiProperty({
    description: 'Previous page number (null if first page)',
    example: null,
    nullable: true,
  })
  previousPage: number | null;
}

/**
 * Paginated response for messages.
 */
export class PaginatedMessagesDto {
  /** Array of messages for the current page */
  @ApiProperty({
    description: 'Array of messages for the current page',
    type: [MessageEntity],
  })
  data: MessageEntity[];

  /** Pagination metadata */
  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
