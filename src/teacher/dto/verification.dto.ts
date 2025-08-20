import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsUrl, 
  IsOptional, 
  IsArray,
  ValidateNested,
  IsEnum 
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DocumentType {
  TEACHING_CERTIFICATE = 'TEACHING_CERTIFICATE',
  EDUCATION_DIPLOMA = 'EDUCATION_DIPLOMA',
  LANGUAGE_CERTIFICATE = 'LANGUAGE_CERTIFICATE',
  IDENTITY_DOCUMENT = 'IDENTITY_DOCUMENT',
  BACKGROUND_CHECK = 'BACKGROUND_CHECK',
  OTHER = 'OTHER'
}

export class VerificationDocumentDto {
  @ApiProperty({
    description: 'Type of document',
    enum: DocumentType,
    example: DocumentType.TEACHING_CERTIFICATE,
  })
  @IsNotEmpty()
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiProperty({
    description: 'Document title or name',
    example: 'TESOL Certificate',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'URL to the uploaded document',
    example: 'https://storage.example.com/documents/tesol-cert.pdf',
  })
  @IsNotEmpty()
  @IsUrl({}, { message: 'Please provide a valid document URL' })
  documentUrl: string;

  @ApiPropertyOptional({
    description: 'Additional description or notes about the document',
    example: 'TESOL certificate obtained from Cambridge University',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SubmitVerificationDto {
  @ApiProperty({
    description: 'List of verification documents',
    type: [VerificationDocumentDto],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VerificationDocumentDto)
  documents: VerificationDocumentDto[];

  @ApiPropertyOptional({
    description: 'Additional notes for the verification process',
    example: 'I have 5 years of experience teaching English to non-native speakers.',
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiPropertyOptional({
    description: 'LinkedIn profile URL',
    example: 'https://linkedin.com/in/teacher-profile',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid LinkedIn URL' })
  linkedinUrl?: string;

  @ApiPropertyOptional({
    description: 'Portfolio website URL',
    example: 'https://myteachingportfolio.com',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid portfolio URL' })
  portfolioUrl?: string;
}

export class VerificationStatusDto {
  @ApiPropertyOptional({
    description: 'Admin review notes',
    example: 'Documents verified successfully. Profile approved.',
  })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
