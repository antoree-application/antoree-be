import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ConversationFilterDto {

  // @Type(() => Number)
  // @IsNumber({}, { message: 'ID must be a number' })
  // id?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Size must be a number' })
  size: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  creator_id?: string;

  @IsOptional()
  @IsString()
  order?: string;

  @IsOptional()
  @IsString({ each: true, message: 'Search fields must be an array of strings' })
  searchFields?: string[];
}

export class DeleteConversationDto {
  @IsNumber({}, { message: 'ID must be a number' })
  id: number;
}
