import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { GroupEntity } from './entities/group.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Groups controller handling group chat creation and management.
 * All endpoints require JWT authentication.
 */
@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  /**
   * Create a new group chat with initial members.
   * Creator is automatically added as admin.
   * @param req - Request with authenticated user
   * @param createGroupDto - Group data and member IDs
   * @returns Created group with member details
   */
  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
    type: GroupEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid member IDs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Request() req, @Body() createGroupDto: CreateGroupDto): Promise<GroupEntity> {
    return this.groupsService.create(req.user.id, createGroupDto);
  }

  /**
   * Get all groups where authenticated user is a member.
   * @param req - Request with authenticated user
   * @returns List of groups (summary only, no full member lists)
   */
  @Get()
  @ApiOperation({ summary: 'Get all groups where user is a member' })
  @ApiResponse({
    status: 200,
    description: 'List of groups',
    type: [GroupEntity],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Request() req): Promise<GroupEntity[]> {
    return this.groupsService.findAll(req.user.id);
  }

  /**
   * Get detailed group information including all members.
   * User must be a member of the group.
   * @param req - Request with authenticated user
   * @param id - Group UUID
   * @returns Group details with full member list
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get group details with members' })
  @ApiResponse({
    status: 200,
    description: 'Group details',
    type: GroupEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a member of this group' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  findOne(@Request() req, @Param('id') id: string): Promise<GroupEntity> {
    return this.groupsService.findOne(req.user.id, id);
  }

  /**
   * Update group name and/or description.
   * Only group admins can update.
   * @param req - Request with authenticated user
   * @param id - Group UUID
   * @param updateGroupDto - Updated group data
   * @returns Updated group details
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update group details (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Group updated successfully',
    type: GroupEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only admins can update group' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ): Promise<GroupEntity> {
    return this.groupsService.update(req.user.id, id, updateGroupDto);
  }

  /**
   * Add new members to a group.
   * Only group admins can add members.
   * @param req - Request with authenticated user
   * @param id - Group UUID
   * @param addMembersDto - User IDs to add
   * @returns Updated group with new members
   */
  @Post(':id/members')
  @ApiOperation({ summary: 'Add members to group (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Members added successfully',
    type: GroupEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid user IDs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only admins can add members' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 409, description: 'One or more users are already members' })
  addMembers(
    @Request() req,
    @Param('id') id: string,
    @Body() addMembersDto: AddMembersDto,
  ): Promise<GroupEntity> {
    return this.groupsService.addMembers(req.user.id, id, addMembersDto);
  }

  /**
   * Remove a member from the group.
   * Admins can remove others (except creator), anyone can remove themselves.
   * If last admin leaves, oldest member is promoted to admin.
   * @param req - Request with authenticated user
   * @param id - Group UUID
   * @param userId - User ID to remove
   * @returns Confirmation message
   */
  @Delete(':id/members/:userId')
  @ApiOperation({
    summary: 'Remove member from group',
    description: 'Admins can remove others (except creator), anyone can remove themselves',
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Member removed successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Group or member not found' })
  removeMember(
    @Request() req,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    return this.groupsService.removeMember(req.user.id, id, userId);
  }

  /**
   * Change a member's role (promote to admin or demote to member).
   * Only group admins can update roles.
   * Cannot demote the last admin.
   * @param req - Request with authenticated user
   * @param id - Group UUID
   * @param userId - User ID to update
   * @param updateMemberRoleDto - New role (admin or member)
   * @returns Confirmation message
   */
  @Patch(':id/members/:userId/role')
  @ApiOperation({
    summary: 'Update member role (admin only)',
    description: 'Promote member to admin or demote admin to member. Cannot demote the last admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Member role updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Member promoted to admin successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Member already has this role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Only admins can update roles or cannot demote last admin' })
  @ApiResponse({ status: 404, description: 'Group or member not found' })
  updateMemberRole(
    @Request() req,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
  ): Promise<{ message: string }> {
    return this.groupsService.updateMemberRole(
      req.user.id,
      id,
      userId,
      updateMemberRoleDto.role,
    );
  }
}
