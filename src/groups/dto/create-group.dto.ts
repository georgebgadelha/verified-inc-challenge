import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ArrayMinSize, IsUUID } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({
    description: 'Group name',
    example: 'Project Team',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Group description',
    example: 'Team chat for the new project',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Array of user IDs to add as initial members (at least 1 required)',
    example: ['550e8400-e29b-41d4-a716-446655440001'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one member must be added to create a group' })
  @IsUUID('4', { each: true })
  memberIds: string[];
}
