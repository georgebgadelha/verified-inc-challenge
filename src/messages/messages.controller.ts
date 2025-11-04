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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageEntity } from './entities/message.entity';
import { PaginatedMessagesDto } from './dto/paginated-messages.dto';

/**
 * Controller for message-related operations.
 * Handles all HTTP requests for sending, retrieving, updating, and deleting messages.
 */
@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * Send a new message. Optionally reply to another message via replyToId.
   * @param createMessageDto - Message content and sender/receiver information
   * @returns The created message
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message', description: 'Create a new message or reply to an existing one' })
  @ApiBody({ type: CreateMessageDto })
  @ApiResponse({ status: 201, description: 'Message created successfully', type: MessageEntity })
  @ApiResponse({ status: 400, description: 'Invalid input or sender/receiver not found' })
  async create(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    createMessageDto: CreateMessageDto,
  ): Promise<MessageEntity> {
    return this.messagesService.create(createMessageDto);
  }

  /**
   * Get all messages with pagination and sorting.
   * @param page - Page number (1-based, default: 1)
   * @param limit - Messages per page (default: 20, max: 100)
   * @param sort - Sort order: 'asc' (oldest first) or 'desc' (newest first, default)
   * @returns Paginated response with messages and metadata
   */
  @Get()
  @ApiOperation({ 
    summary: 'Get all messages', 
    description: 'Retrieve messages with pagination. Use page + limit for clean, intuitive pagination.' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1, min: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Messages per page (default: 20, min: 1, max: 100)' })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'], description: 'Sort order (default: desc = newest first)' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully', type: PaginatedMessagesDto })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: 'asc' | 'desc',
  ): Promise<PaginatedMessagesDto> {
    // Validate and constrain inputs
    const validPage = page ? Math.max(1, page) : 1;
    const validLimit = limit ? Math.max(1, Math.min(limit, 100)) : 20;
    const validSort = sort === 'asc' || sort === 'desc' ? sort : 'desc';
    
    return this.messagesService.findAll(validPage, validLimit, validSort);
  }

  /**
   * Get a specific message by ID.
   * @param id - UUID of the message
   * @returns The requested message
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get message by ID', description: 'Retrieve a specific message by its UUID' })
  @ApiParam({ name: 'id', description: 'Message UUID', type: String })
  @ApiResponse({ status: 200, description: 'Message found', type: MessageEntity })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async findOne(@Param('id') id: string): Promise<MessageEntity> {
    return this.messagesService.findOne(id);
  }

  /**
   * Update a message's content. Other fields (sender, receiver) are immutable.
   * @param id - UUID of the message to update
   * @param updateMessageDto - New content
   * @returns The updated message
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update message', description: 'Update a message\'s content (sender/receiver are immutable)' })
  @ApiParam({ name: 'id', description: 'Message UUID', type: String })
  @ApiBody({ type: UpdateMessageDto })
  @ApiResponse({ status: 200, description: 'Message updated successfully', type: MessageEntity })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    updateMessageDto: UpdateMessageDto,
  ): Promise<MessageEntity> {
    return this.messagesService.update(id, updateMessageDto);
  }

  /**
   * Delete a message.
   * @param id - UUID of the message to delete
   * @returns 204 No Content on success
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete message', description: 'Delete a message (replies will have replyToId set to null)' })
  @ApiParam({ name: 'id', description: 'Message UUID', type: String })
  @ApiResponse({ status: 204, description: 'Message deleted successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.messagesService.remove(id);
  }

  /**
   * Get all replies to a specific message (threaded conversation).
   * @param id - UUID of the parent message
   * @returns Array of reply messages ordered by creation date (oldest first)
   */
  @Get(':id/replies')
  @ApiOperation({ summary: 'Get message replies', description: 'Get all replies to a specific message (oldest first)' })
  @ApiParam({ name: 'id', description: 'Parent message UUID', type: String })
  @ApiResponse({ status: 200, description: 'Replies retrieved successfully', type: [MessageEntity] })
  @ApiResponse({ status: 404, description: 'Parent message not found' })
  async findReplies(@Param('id') id: string): Promise<MessageEntity[]> {
    return this.messagesService.findReplies(id);
  }
}
