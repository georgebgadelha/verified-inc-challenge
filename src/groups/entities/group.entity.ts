import { ApiProperty } from '@nestjs/swagger';

export class GroupMemberEntity {
  @ApiProperty({
    description: 'Member ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({
    description: 'User name',
    example: 'Alice',
  })
  userName: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+12025551001',
  })
  userPhone: string;

  @ApiProperty({
    description: 'Member role in group',
    example: 'admin',
    enum: ['admin', 'member'],
  })
  role: string;

  @ApiProperty({
    description: 'Timestamp when user joined the group',
    example: '2025-11-07T10:30:00.000Z',
  })
  joinedAt: Date;

  constructor(partial: Partial<GroupMemberEntity>) {
    Object.assign(this, partial);
  }
}

export class GroupEntity {
  @ApiProperty({
    description: 'Group ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Group name',
    example: 'Project Team',
  })
  name: string;

  @ApiProperty({
    description: 'Group description',
    example: 'Team chat for the new project',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'ID of user who created the group',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  createdById: string;

  @ApiProperty({
    description: 'Name of user who created the group',
    example: 'Alice',
  })
  createdByName: string;

  @ApiProperty({
    description: 'Number of members in the group',
    example: 5,
  })
  memberCount: number;

  @ApiProperty({
    description: 'Group members (included when explicitly requested)',
    type: [GroupMemberEntity],
    required: false,
  })
  members?: GroupMemberEntity[];

  @ApiProperty({
    description: 'Timestamp when group was created',
    example: '2025-11-07T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when group was last updated',
    example: '2025-11-07T10:30:00.000Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<GroupEntity>) {
    Object.assign(this, partial);
  }
}
