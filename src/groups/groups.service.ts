import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { GroupEntity, GroupMemberEntity } from './entities/group.entity';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Create a new group with initial members
   * The creator is automatically added as an admin
   */
  async create(userId: string, createGroupDto: CreateGroupDto): Promise<GroupEntity> {
    const { name, description, memberIds } = createGroupDto;

    // Validate all member IDs exist and are not deleted
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: memberIds },
        isDeleted: false,
      },
      select: {
        id: true, // Only need ID for validation
      },
    });

    if (users.length !== memberIds.length) {
      throw new BadRequestException('One or more user IDs are invalid');
    }

    // Create group with creator as admin and initial members
    const group = await this.prisma.group.create({
      data: {
        name,
        description,
        createdById: userId,
        members: {
          create: [
            // Add creator as admin
            { userId, role: 'admin' },
            // Add other members
            ...memberIds
              .filter((id) => id !== userId) // Don't duplicate creator
              .map((id) => ({ userId: id, role: 'member' })),
          ],
        },
      },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    return new GroupEntity({
      id: group.id,
      name: group.name,
      description: group.description,
      createdById: group.createdById,
      createdByName: group.createdBy.name,
      memberCount: group.members.length,
      members: group.members.map(
        (m) =>
          new GroupMemberEntity({
            id: m.id,
            userId: m.userId,
            userName: m.user.name,
            userPhone: m.user.phoneNumber,
            role: m.role,
            joinedAt: m.joinedAt,
          }),
      ),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    });
  }

  /**
   * Get all groups where the user is a member
   * Returns summary info only (no full member list for performance)
   */
  async findAll(userId: string): Promise<GroupEntity[]> {
    const groups = await this.prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return groups.map(
      (group) =>
        new GroupEntity({
          id: group.id,
          name: group.name,
          description: group.description,
          createdById: group.createdById,
          createdByName: group.createdBy.name,
          memberCount: group._count.members,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        }),
    );
  }

  /**
   * Get a specific group with full member details
   */
  async findOne(userId: string, groupId: string): Promise<GroupEntity> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
                isDeleted: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    // Check if user is a member
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    return new GroupEntity({
      id: group.id,
      name: group.name,
      description: group.description,
      createdById: group.createdById,
      createdByName: group.createdBy.name,
      memberCount: group.members.length,
      members: group.members.map(
        (m) =>
          new GroupMemberEntity({
            id: m.id,
            userId: m.userId,
            userName: m.user.isDeleted ? 'Deleted User' : m.user.name,
            userPhone: m.user.isDeleted ? '+0000000000' : m.user.phoneNumber,
            role: m.role,
            joinedAt: m.joinedAt,
          }),
      ),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    });
  }

  /**
   * Update group details (name, description)
   * Only group creator or admins can update
   */
  async update(userId: string, groupId: string, updateGroupDto: UpdateGroupDto): Promise<GroupEntity> {
    await this.validateGroupAccess(userId, groupId, true); // Must be admin

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: updateGroupDto,
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
        members: true,
      },
    });

    return new GroupEntity({
      id: group.id,
      name: group.name,
      description: group.description,
      createdById: group.createdById,
      createdByName: group.createdBy.name,
      memberCount: group.members.length,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    });
  }

  /**
   * Add members to a group
   * Only group admins can add members
   */
  async addMembers(userId: string, groupId: string, addMembersDto: AddMembersDto): Promise<GroupEntity> {
    await this.validateGroupAccess(userId, groupId, true); // Must be admin

    const { userIds } = addMembersDto;

    // Validate all user IDs exist
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        isDeleted: false,
      },
      select: {
        id: true, // Only need ID for validation
      },
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException('One or more user IDs are invalid');
    }

    // Check for existing members
    const existingMembers = await this.prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { in: userIds },
      },
      select: {
        userId: true, // Only need userId for conflict check
      },
    });

    if (existingMembers.length > 0) {
      const existingIds = existingMembers.map((m) => m.userId);
      throw new ConflictException(`Users ${existingIds.join(', ')} are already members of this group`);
    }

    // Add new members
    await this.prisma.groupMember.createMany({
      data: userIds.map((uid) => ({
        groupId,
        userId: uid,
        role: 'member',
      })),
    });

    // Invalidate cache for all newly added members
    await this.cacheService.invalidateGroupMemberships(groupId, userIds);

    return this.findOne(userId, groupId);
  }

  /**
   * Remove a member from the group
   * Admins can remove anyone (except creator), members can only remove themselves
   * If the last admin leaves, automatically promote the oldest member to admin
   */
  async removeMember(userId: string, groupId: string, memberUserId: string): Promise<{ message: string }> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        createdById: true,
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            joinedAt: true,
          },
          orderBy: {
            joinedAt: 'asc', // Oldest first
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    // Check if requesting user is a member
    const requesterMember = group.members.find((m) => m.userId === userId);
    if (!requesterMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    // Check if target user is a member
    const targetMember = group.members.find((m) => m.userId === memberUserId);
    if (!targetMember) {
      throw new NotFoundException('User is not a member of this group');
    }

    // Cannot remove the group creator
    if (memberUserId === group.createdById) {
      throw new ForbiddenException('Cannot remove the group creator');
    }

    // Only admins can remove others, anyone can remove themselves
    if (userId !== memberUserId && requesterMember.role !== 'admin') {
      throw new ForbiddenException('Only admins can remove other members');
    }

    // Check if removing the last admin
    const admins = group.members.filter((m) => m.role === 'admin');
    const isLastAdmin = targetMember.role === 'admin' && admins.length === 1;

    if (isLastAdmin) {
      // Find the oldest non-admin member to promote
      const oldestMember = group.members.find(
        (m) => m.role === 'member' && m.userId !== memberUserId
      );

      if (!oldestMember) {
        throw new ForbiddenException(
          'Cannot remove the last admin. Group must have at least one admin.'
        );
      }

      // Use transaction to ensure atomicity
      await this.prisma.$transaction([
        // Promote oldest member to admin
        this.prisma.groupMember.update({
          where: { id: oldestMember.id },
          data: { role: 'admin' },
        }),
        // Remove the leaving member
        this.prisma.groupMember.delete({
          where: { id: targetMember.id },
        }),
      ]);

      // Invalidate cache for both affected users
      await this.cacheService.invalidateGroupMemberships(groupId, [
        memberUserId,
        oldestMember.userId,
      ]);

      return {
        message: `Member removed successfully. ${oldestMember.userId} has been promoted to admin.`,
      };
    }

    // Remove member (not the last admin)
    await this.prisma.groupMember.delete({
      where: { id: targetMember.id },
    });

    // Invalidate cache for removed member
    await this.cacheService.invalidateGroupMembership(memberUserId, groupId);

    return { message: 'Member removed successfully' };
  }

  /**
   * Update a member's role (promote to admin or demote to member)
   * Only group admins can change member roles
   * Cannot demote the last admin
   */
  async updateMemberRole(
    userId: string,
    groupId: string,
    memberUserId: string,
    newRole: 'admin' | 'member',
  ): Promise<{ message: string }> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    // Check if requesting user is an admin
    const requesterMember = group.members.find((m) => m.userId === userId);
    if (!requesterMember || requesterMember.role !== 'admin') {
      throw new ForbiddenException('Only group admins can change member roles');
    }

    // Check if target user is a member
    const targetMember = group.members.find((m) => m.userId === memberUserId);
    if (!targetMember) {
      throw new NotFoundException('User is not a member of this group');
    }

    // If already has this role, no change needed
    if (targetMember.role === newRole) {
      return { message: `User is already a ${newRole}` };
    }

    // If demoting from admin to member, check if they're the last admin
    if (targetMember.role === 'admin' && newRole === 'member') {
      const admins = group.members.filter((m) => m.role === 'admin');
      if (admins.length === 1) {
        throw new ForbiddenException(
          'Cannot demote the last admin. Group must have at least one admin.'
        );
      }
    }

    // Update role
    await this.prisma.groupMember.update({
      where: { id: targetMember.id },
      data: { role: newRole },
    });

    const action = newRole === 'admin' ? 'promoted to' : 'demoted to';
    return { message: `Member ${action} ${newRole} successfully` };
  }

  /**
   * Check if user is a member of the group (optionally must be admin)
   * Uses cache to minimize database queries
   */
  async validateGroupAccess(userId: string, groupId: string, requireAdmin = false): Promise<void> {
    // Check cache first
    const cachedMembership = await this.cacheService.getGroupMembership(userId, groupId);
    
    let member;
    
    if (cachedMembership !== undefined) {
      // Cache hit - if not a member, throw immediately
      if (!cachedMembership) {
        throw new ForbiddenException('You are not a member of this group');
      }
      
      // If admin check is required, we need to query DB for role
      // (we only cache boolean membership, not role details)
      if (requireAdmin) {
        member = await this.prisma.groupMember.findFirst({
          where: { groupId, userId },
        });
        
        if (!member || member.role !== 'admin') {
          throw new ForbiddenException('Only group admins can perform this action');
        }
      }
      
      return;
    }
    
    // Cache miss - query database
    member = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
      },
    });

    // Cache the membership result (TTL: 5 minutes)
    await this.cacheService.setGroupMembership(userId, groupId, !!member, 300);

    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }

    if (requireAdmin && member.role !== 'admin') {
      throw new ForbiddenException('Only group admins can perform this action');
    }
  }

  /**
   * Check if user is a member of the group (returns boolean)
   * Uses cache for high-performance validation
   */
  async isMember(userId: string, groupId: string): Promise<boolean> {
    // Check cache first
    const cachedMembership = await this.cacheService.getGroupMembership(userId, groupId);
    
    if (cachedMembership !== undefined) {
      return cachedMembership;
    }
    
    // Cache miss - query database
    const member = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
      },
    });

    const isMember = !!member;
    
    // Cache the result (TTL: 5 minutes)
    await this.cacheService.setGroupMembership(userId, groupId, isMember, 300);

    return isMember;
  }
}
