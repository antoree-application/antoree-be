import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, Min, Max, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAvailabilityDto {
  @ApiProperty({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Start time in HH:mm format',
    example: '09:00',
  })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:mm format',
    example: '17:00',
  })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Whether this availability is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAvailabilityDto {
  @ApiPropertyOptional({
    description: 'Start time in HH:mm format',
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time in HH:mm format',
    example: '17:00',
  })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Whether this availability is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
