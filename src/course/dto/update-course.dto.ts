import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCourseDto } from './create-course.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
  @ApiPropertyOptional({
    description: 'Whether the course is active and bookable',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
