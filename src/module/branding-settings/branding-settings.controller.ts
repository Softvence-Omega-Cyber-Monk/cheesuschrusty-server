import {
  Controller,
  Patch,
  Get,
  Body,
  UseInterceptors,
  UploadedFiles,
  Res,
  HttpStatus,
} from '@nestjs/common';
import {  Response } from 'express';

import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BrandingSettingsService } from './branding-settings.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateBrandingDto } from './dto/branding.dto';
import sendResponse from 'src/module/utils/sendResponse';

@ApiTags('Branding Settings')
@Controller('settings/branding')
export class BrandingSettingsController {
  constructor(private readonly brandingService: BrandingSettingsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
  @ApiOperation({ summary: 'Retrieve current branding settings.' })
  async getBranding(@Res() res: Response) {
    const branding = await this.brandingService.getBranding();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Branding settings retrieved successfully.',
      data: branding,
    });
  }

  
@Patch()
@Roles(Role.SUPER_ADMIN, Role.CONTENT_MANAGER)
@UseInterceptors(AnyFilesInterceptor())
@ApiOperation({
  summary: 'Create or update branding settings (colors, fonts, logo, favicon) in one API.',
  description:
    'You can optionally upload `logo` and/or `favicon` along with color and font settings.',
})
@ApiConsumes('multipart/form-data')
@ApiBody({ type: UpdateBrandingDto })
async updateBranding(
  @Body() dto: UpdateBrandingDto,
  @UploadedFiles() files: Express.Multer.File[],
  @Res() res: Response,
) {
  const updatedBranding = await this.brandingService.updateBranding(dto, files);

  return sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: 'Branding settings updated successfully.',
    data: updatedBranding,
  });
}
}
