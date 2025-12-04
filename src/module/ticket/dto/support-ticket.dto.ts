import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({
    example: 'Issue accessing lesson',
    description: 'Short subject describing the issue',
  })
  @IsString()
  @IsNotEmpty({ message: 'Subject is required' })
  subject: string;

  @ApiProperty({
    example: 'I am unable to open lesson B1 Reading Part 3.',
    description: 'The first message attached to the ticket',
  })
  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @MinLength(5, { message: 'Message must be at least 5 characters long' })
  message: string;
}


export class AddTicketMessageDto {
  @ApiProperty({
    example: 'I have attached the screenshot.',
    description: 'Reply message text',
  })
  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  @MinLength(2, { message: 'Message must be at least 2 characters long' })
  message: string;
}


export class UpdateTicketStatusDto {
  @ApiProperty({
    example: 'RESOLVED',
    description: 'New status for the ticket',
    enum: TicketStatus,
  })
  @IsEnum(TicketStatus, { message: 'Invalid ticket status' })
  @IsNotEmpty({ message: 'Status is required' })
  status: TicketStatus;
}


export class GetTicketsQueryDto {
  @ApiPropertyOptional({
    example: 'PENDING',
    description: 'Filter tickets by status',
    enum: TicketStatus,
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({
    example: 'login issue',
    description: 'Search text in ticket subject',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}