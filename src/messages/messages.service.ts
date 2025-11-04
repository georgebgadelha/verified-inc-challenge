import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageEntity } from './entities/message.entity';
import { PaginatedMessagesDto, PaginationMeta } from './dto/paginated-messages.dto';

/**
 * Service handling all business logic for message operations.
 * Validates data, interacts with the database, and transforms responses.
 */
@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new message. Validates sender, receiver, and optional reply target exist.
   * @param createMessageDto - Message data
   * @returns The created message
   */
  async create(createMessageDto: CreateMessageDto): Promise<MessageEntity> {
    const { senderId, receiverId, replyToId, content } = createMessageDto;

    // Validate sender and receiver exist
    await this.validateUserExists(senderId, 'Sender');
    await this.validateUserExists(receiverId, 'Receiver');

    // Validate replyTo message exists if provided
    if (replyToId) {
      await this.validateMessageExists(replyToId);
    }

    const message = await this.prisma.message.create({
      data: {
        content,
        senderId,
        receiverId,
        replyToId,
      },
    });

    return new MessageEntity(message);
  }

  /**
   * Get all messages with pagination and metadata.
   * @param page - Page number (1-based, default: 1)
   * @param limit - Number of messages per page (default: 20, max: 100)
   * @param sort - Sort order: 'asc' (oldest first) or 'desc' (newest first, default)
   * @returns Paginated response with messages and metadata
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    sort: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedMessagesDto> {
    // Calculate offset from page number and limit
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalItems = await this.prisma.message.count();

    // Fetch messages for current page
    const messages = await this.prisma.message.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: sort },
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const meta: PaginationMeta = {
      currentPage: page,
      pageSize: limit,
      totalItems,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      nextPage: hasNextPage ? page + 1 : null,
      previousPage: hasPreviousPage ? page - 1 : null,
    };

    return {
      data: messages.map((message) => new MessageEntity(message)),
      meta,
    };
  }

  /**
   * Get a single message by ID.
   * @param id - Message UUID
   * @returns The requested message
   * @throws NotFoundException if message doesn't exist
   */
  async findOne(id: string): Promise<MessageEntity> {
    const message = await this.prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }

    return new MessageEntity(message);
  }

  /**
   * Update a message's content. Only content is editable.
   * @param id - Message UUID
   * @param updateMessageDto - Updated content
   * @returns The updated message
   */
  async update(id: string, updateMessageDto: UpdateMessageDto): Promise<MessageEntity> {
    // Check if message exists
    await this.findOne(id);

    const message = await this.prisma.message.update({
      where: { id },
      data: updateMessageDto,
    });

    return new MessageEntity(message);
  }

  /**
   * Delete a message. Replies to this message will have their replyToId set to null.
   * @param id - Message UUID
   */
  async remove(id: string): Promise<void> {
    // Check if message exists
    await this.findOne(id);

    await this.prisma.message.delete({
      where: { id },
    });
  }

  /**
   * Get all replies to a specific message.
   * @param messageId - Parent message UUID
   * @returns Array of reply messages ordered by creation date (oldest first)
   */
  async findReplies(messageId: string): Promise<MessageEntity[]> {
    // Check if parent message exists
    await this.findOne(messageId);

    const replies = await this.prisma.message.findMany({
      where: { replyToId: messageId },
      orderBy: { createdAt: 'asc' },
    });

    return replies.map((reply) => new MessageEntity(reply));
  }

  /**
   * Validate that a user exists in the database.
   * @param userId - User UUID
   * @param userType - Description for error message (e.g., "Sender", "Receiver")
   * @throws BadRequestException if user doesn't exist
   */
  private async validateUserExists(userId: string, userType: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException(`${userType} with ID ${userId} not found`);
    }
  }

  /**
   * Validate that a message exists in the database.
   * @param messageId - Message UUID
   * @throws BadRequestException if message doesn't exist
   */
  private async validateMessageExists(messageId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new BadRequestException(`Reply target message with ID ${messageId} not found`);
    }
  }
}
