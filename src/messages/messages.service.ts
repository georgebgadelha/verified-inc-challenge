import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageEntity } from './entities/message.entity';
import { PaginatedMessagesDto, CursorPaginationMeta } from './dto/paginated-messages.dto';
import { GroupsService } from '../groups/groups.service';

/**
 * Service handling all business logic for message operations.
 * Validates data, interacts with the database, and transforms responses.
 */
@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  /**
   * Create a new message. Validates sender, receiver/group, and optional reply target exist.
   * Supports both direct messages (1-on-1) and group messages.
   * Captures user info snapshot at creation time.
   * @param senderId - ID of the authenticated user sending the message
   * @param createMessageDto - Message data (without senderId)
   * @returns The created message
   */
  async create(senderId: string, createMessageDto: CreateMessageDto): Promise<MessageEntity> {
    const { receiverId, groupId, replyToId, content } = createMessageDto;

    // Validate it's either a direct message OR a group message (not both)
    if ((receiverId && groupId) || (!receiverId && !groupId)) {
      throw new BadRequestException('Message must have either receiverId or groupId, but not both');
    }

    // Validate sender exists and get their data
    const sender = await this.validateUserExists(senderId, 'Sender');

    let messageData: any = {
      content,
      senderId,
      replyToId,
      senderName: sender.name,
      senderPhone: sender.phoneNumber,
    };

    // Handle direct message
    if (receiverId) {
      const receiver = await this.validateUserExists(receiverId, 'Receiver');
      messageData.receiverId = receiverId;
      messageData.receiverName = receiver.name;
      messageData.receiverPhone = receiver.phoneNumber;
    }

    // Handle group message
    if (groupId) {
      // Validate group exists
      await this.validateGroupExists(groupId);
      // Validate sender is a member of the group
      const isMember = await this.groupsService.isMember(senderId, groupId);
      if (!isMember) {
        throw new BadRequestException('You are not a member of this group');
      }
      messageData.groupId = groupId;
      // receiverName and receiverPhone are null for group messages
      messageData.receiverName = null;
      messageData.receiverPhone = null;
    }

    // Validate replyTo message exists if provided
    if (replyToId) {
      await this.validateMessageExists(replyToId);
    }

    const message = await this.prisma.message.create({
      data: messageData,
    });

    return new MessageEntity(message);
  }

  /**
   * Get messages for a specific user (sent or received) with cursor-based pagination for consistent results.
   * Uses createdAt timestamp + ID as cursor to handle real-time data changes.
   * @param userId - The ID of the user to filter messages for (sender or receiver)
   * @param cursor - Optional cursor for pagination (format: "timestamp_id")
   * @param limit - Number of messages per page (default: 20, max: 100)
   * @param sort - Sort order: 'asc' (oldest first) or 'desc' (newest first, default)
   * @returns Paginated response with messages and cursor metadata
   */
  async findAll(
    userId: string,
    cursor?: string,
    limit: number = 20,
    sort: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedMessagesDto> {
    // Fetch one extra to check if there are more results
    const take = limit + 1;
    
    let cursorCondition: any = {};
    
    // Parse cursor if provided (format: "timestamp_id")
    if (cursor) {
      const [timestamp, id] = cursor.split('_');
      if (!timestamp || !id) {
        throw new BadRequestException('Invalid cursor format. Expected: "timestamp_id"');
      }
      
      const cursorDate = new Date(timestamp);
      if (isNaN(cursorDate.getTime())) {
        throw new BadRequestException('Invalid cursor timestamp');
      }
      
      // For descending order (newest first), get messages older than cursor
      // For ascending order (oldest first), get messages newer than cursor
      if (sort === 'desc') {
        cursorCondition = {
          OR: [
            { createdAt: { lt: cursorDate } },
            { 
              createdAt: cursorDate,
              id: { lt: id }
            }
          ]
        };
      } else {
        cursorCondition = {
          OR: [
            { createdAt: { gt: cursorDate } },
            { 
              createdAt: cursorDate,
              id: { gt: id }
            }
          ]
        };
      }
    }

    // Build where clause: user must be sender OR receiver
    const whereClause: any = {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    };

    // Add cursor condition if present
    if (Object.keys(cursorCondition).length > 0) {
      whereClause.AND = cursorCondition;
    }

    // Fetch messages with cursor condition and user filter
    const messages = await this.prisma.message.findMany({
      where: whereClause,
      take,
      orderBy: [
        { createdAt: sort },
        { id: sort } // Secondary sort by ID for tie-breaking
      ],
    });

    // Check if there are more results
    const hasMore = messages.length > limit;
    
    // Remove the extra item if it exists
    const dataItems = hasMore ? messages.slice(0, limit) : messages;
    
    // Generate cursors for next/prev pages
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;
    
    if (hasMore && dataItems.length > 0) {
      const lastItem = dataItems[dataItems.length - 1];
      nextCursor = `${lastItem.createdAt.toISOString()}_${lastItem.id}`;
    }
    
    if (dataItems.length > 0) {
      const firstItem = dataItems[0];
      prevCursor = `${firstItem.createdAt.toISOString()}_${firstItem.id}`;
    }

    const meta: CursorPaginationMeta = {
      count: dataItems.length,
      limit,
      nextCursor,
      prevCursor,
      hasMore,
    };

    return {
      data: dataItems.map((message) => new MessageEntity(message)),
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
   * Get messages for a specific group with cursor-based pagination.
   * Validates user is a member of the group before returning messages.
   * @param groupId - The ID of the group
   * @param userId - The ID of the authenticated user (must be a member)
   * @param cursor - Optional cursor for pagination (format: "timestamp_id")
   * @param limit - Number of messages per page (default: 20, max: 100)
   * @param sort - Sort order: 'asc' (oldest first) or 'desc' (newest first, default)
   * @returns Paginated response with group messages and cursor metadata
   */
  async findGroupMessages(
    groupId: string,
    userId: string,
    cursor?: string,
    limit: number = 20,
    sort: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedMessagesDto> {
    // Validate group exists
    await this.validateGroupExists(groupId);

    // Validate user is a member of the group
    const isMember = await this.groupsService.isMember(userId, groupId);
    if (!isMember) {
      throw new BadRequestException('You are not a member of this group');
    }

    // Fetch one extra to check if there are more results
    const take = limit + 1;
    
    let cursorCondition: any = {};
    
    // Parse cursor if provided (format: "timestamp_id")
    if (cursor) {
      const [timestamp, id] = cursor.split('_');
      if (!timestamp || !id) {
        throw new BadRequestException('Invalid cursor format. Expected: "timestamp_id"');
      }
      
      const cursorDate = new Date(timestamp);
      if (isNaN(cursorDate.getTime())) {
        throw new BadRequestException('Invalid cursor timestamp');
      }
      
      // For descending order (newest first), get messages older than cursor
      // For ascending order (oldest first), get messages newer than cursor
      if (sort === 'desc') {
        cursorCondition = {
          OR: [
            { createdAt: { lt: cursorDate } },
            { 
              createdAt: cursorDate,
              id: { lt: id }
            }
          ]
        };
      } else {
        cursorCondition = {
          OR: [
            { createdAt: { gt: cursorDate } },
            { 
              createdAt: cursorDate,
              id: { gt: id }
            }
          ]
        };
      }
    }

    // Build where clause: filter by groupId
    const whereClause: any = {
      groupId,
    };

    // Add cursor condition if present
    if (Object.keys(cursorCondition).length > 0) {
      whereClause.AND = cursorCondition;
    }

    // Fetch messages with cursor condition and group filter
    const messages = await this.prisma.message.findMany({
      where: whereClause,
      take,
      orderBy: [
        { createdAt: sort },
        { id: sort } // Secondary sort by ID for tie-breaking
      ],
    });

    // Check if there are more results
    const hasMore = messages.length > limit;
    
    // Remove the extra item if it exists
    const dataItems = hasMore ? messages.slice(0, limit) : messages;
    
    // Generate cursors for next/prev pages
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;
    
    if (hasMore && dataItems.length > 0) {
      const lastItem = dataItems[dataItems.length - 1];
      nextCursor = `${lastItem.createdAt.toISOString()}_${lastItem.id}`;
    }
    
    if (dataItems.length > 0) {
      const firstItem = dataItems[0];
      prevCursor = `${firstItem.createdAt.toISOString()}_${firstItem.id}`;
    }

    const meta: CursorPaginationMeta = {
      count: dataItems.length,
      limit,
      nextCursor,
      prevCursor,
      hasMore,
    };

    return {
      data: dataItems.map((message) => new MessageEntity(message)),
      meta,
    };
  }

  /**
   * Validate that a user exists in the database and return user data.
   * @param userId - User UUID
   * @param userType - Description for error message (e.g., "Sender", "Receiver")
   * @returns User data
   * @throws BadRequestException if user doesn't exist
   */
  private async validateUserExists(userId: string, userType: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
      },
    });

    if (!user) {
      throw new BadRequestException(`${userType} with ID ${userId} not found`);
    }

    return user;
  }

  /**
   * Validate that a group exists in the database.
   * @param groupId - Group UUID
   * @throws BadRequestException if group doesn't exist
   */
  private async validateGroupExists(groupId: string): Promise<void> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new BadRequestException(`Group with ID ${groupId} not found`);
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
