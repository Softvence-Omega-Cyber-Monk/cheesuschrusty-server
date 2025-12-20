import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateUserDto {
  @IsBoolean()
  isBlocked: boolean;
}



export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  weeklyUpdateEnabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  streakRemindersEnabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  achievementAlertsEnabled?: boolean;


  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  dailyGoalMinutes?: number;

}