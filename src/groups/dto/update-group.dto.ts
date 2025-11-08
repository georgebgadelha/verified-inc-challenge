import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateGroupDto {
  @ApiProperty({
    description: 'Group name',
    example: 'Updated Project Team',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Group description',
    example: 'Updated team chat description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
