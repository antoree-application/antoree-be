import { PartialType } from '@nestjs/swagger';
import { CreateTeacherDto } from './create-teacher.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TeacherStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {
  @ApiPropertyOptional({
    description: 'Teacher status',
    enum: TeacherStatus,
    example: TeacherStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(TeacherStatus)
  status?: TeacherStatus;
}
