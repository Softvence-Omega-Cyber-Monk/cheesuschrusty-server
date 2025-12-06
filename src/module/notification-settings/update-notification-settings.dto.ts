import { IsBoolean, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  newRegistrationAlert?: boolean;

  @ApiPropertyOptional({ example: true, description: "Alerts for both successful & failed payments" })
  @IsOptional()
  @IsBoolean()
  paymentRelatedAlert?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  supportTicketAlert?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  dailyAnalyticsSummary?: boolean;

  // User Notification Toggles
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  welcomeEmailEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  learningRemindersEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  achievementNotifications?: boolean;
}
