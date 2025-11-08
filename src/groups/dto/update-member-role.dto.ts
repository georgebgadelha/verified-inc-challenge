import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the member',
    enum: ['admin', 'member'],
    example: 'admin',
  })
  @IsEnum(['admin', 'member'])
  role: 'admin' | 'member';
}
