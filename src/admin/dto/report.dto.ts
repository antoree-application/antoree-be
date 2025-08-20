import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

// Note: ReportStatus enum doesn't exist in current schema
// This is a placeholder until the Report model is added
export enum ReportStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export class UpdateReportDto {

  @IsNumber()
  id?: number;

  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsOptional()
  @IsString()
  rejectedReason?: string;
}

export class ReportFilterDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Size must be a number' })
  size: number = 10;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString({ each: true, message: 'Search fields must be an array of strings' })
  searchFields?: string[];

  @IsOptional()
  @IsString()
  order?: string;
} 
