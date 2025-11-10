import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageEntity } from './entities/message.entity';
import { PaginatedMessagesDto } from './dto/paginated-messages.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Controller for message-related operations.
 * Handles all HTTP requests for sending, retrieving, updating, and deleting messages.
 * All endpoints require JWT authentication.
 */
@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * Send a new message. Optionally reply to another message via replyToId.
   * The authenticated user is automatically set as the sender.
   * @param createMessageDto - Message content and receiver/group information
   * @param req - Request object containing authenticated user
   * @returns The created message
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message', description: 'Create a new message or reply to an existing one. Sender is automatically set to authenticated user.' })
  @ApiBody({ type: CreateMessageDto })
  @ApiResponse({ status: 201, description: 'Message created successfully', type: MessageEntity })
  @ApiResponse({ status: 400, description: 'Invalid input or receiver/group not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    createMessageDto: CreateMessageDto,
    @Request() req,
  ): Promise<MessageEntity> {
    // Automatically use authenticated user as sender
    return this.messagesService.create(req.user.id, createMessageDto);
  }

  /**
   * Get all messages for the authenticated user (sent or received) with cursor-based pagination and sorting.
   * @param cursor - Optional cursor for pagination (from meta.nextCursor of previous response)
   * @param limit - Messages per page (default: 20, max: 100)
   * @param sort - Sort order: 'asc' (oldest first) or 'desc' (newest first, default)
   * @param req - Request object containing authenticated user
   * @returns Paginated response with messages and cursor metadata
   */
  @Get()
  @ApiOperation({ 
    summary: 'Get messages for authenticated user', 
    description: 'Retrieve messages where the authenticated user is either sender or receiver. Uses cursor-based pagination for consistent results. Use meta.nextCursor from response to fetch next page.' 
  })
  @ApiQuery({ 
    name: 'cursor', 
    required: false, 
    type: String, 
    description: 'Cursor for pagination (format: timestamp_id). Get from meta.nextCursor of previous response.' 
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Messages per page (default: 20, min: 1, max: 100)' })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'], description: 'Sort order (default: desc = newest first)' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully', type: PaginatedMessagesDto })
  @ApiResponse({ status: 400, description: 'Invalid cursor format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Request() req,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
    @Query('sort') sort?: 'asc' | 'desc',
  ): Promise<PaginatedMessagesDto> {
    // Validate and constrain inputs
    const validLimit = limit ? Math.max(1, Math.min(limit, 100)) : 20;
    const validSort = sort === 'asc' || sort === 'desc' ? sort : 'desc';
    
    return this.messagesService.findAll(req.user.id, cursor, validLimit, validSort);
  }

  /**
   * Get a specific message by ID.
   * @param id - UUID of the message
   * @returns The requested message
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get message by ID', description: 'Retrieve a specific message by its UUID (requires authentication)' })
  @ApiParam({ name: 'id', description: 'Message UUID', type: String })
  @ApiResponse({ status: 200, description: 'Message found', type: MessageEntity })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string): Promise<MessageEntity> {
    return this.messagesService.findOne(id);
  }

  /**
   * Update a message's content. Other fields (sender, receiver) are immutable.
   * Only the message sender can update their own messages.
   * @param id - UUID of the message to update
   * @param updateMessageDto - New content
   * @param req - Request object containing authenticated user
   * @returns The updated message
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update message', description: 'Update a message\'s content (only sender can edit, sender/receiver are immutable)' })
  @ApiParam({ name: 'id', description: 'Message UUID', type: String })
  @ApiBody({ type: UpdateMessageDto })
  @ApiResponse({ status: 200, description: 'Message updated successfully', type: MessageEntity })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - only message sender can update' })
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    updateMessageDto: UpdateMessageDto,
    @Request() req,
  ): Promise<MessageEntity> {
    // Verify ownership
    const message = await this.messagesService.findOne(id);
    if (message.senderId !== req.user.id) {
      throw new ForbiddenException('You can only update your own messages');
    }
    return this.messagesService.update(id, updateMessageDto);
  }

  /**
   * Delete a message. Only the message sender can delete their own messages.
   * @param id - UUID of the message to delete
   * @param req - Request object containing authenticated user
   * @returns 204 No Content on success
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete message', description: 'Delete a message (only sender can delete, replies will have replyToId set to null)' })
  @ApiParam({ name: 'id', description: 'Message UUID', type: String })
  @ApiResponse({ status: 204, description: 'Message deleted successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - only message sender can delete' })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    // Verify ownership
    const message = await this.messagesService.findOne(id);
    if (message.senderId !== req.user.id) {
      throw new ForbiddenException('You can only delete your own messages');
    }
    return this.messagesService.remove(id);
  }

  /**
   * Get all replies to a specific message (threaded conversation).
   * @param id - UUID of the parent message
   * @returns Array of reply messages ordered by creation date (oldest first)
   */
  @Get(':id/replies')
  @ApiOperation({ summary: 'Get message replies', description: 'Get all replies to a specific message (oldest first, requires authentication)' })
  @ApiParam({ name: 'id', description: 'Parent message UUID', type: String })
  @ApiResponse({ status: 200, description: 'Replies retrieved successfully', type: [MessageEntity] })
  @ApiResponse({ status: 404, description: 'Parent message not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findReplies(@Param('id') id: string): Promise<MessageEntity[]> {
    return this.messagesService.findReplies(id);
  }


}
