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
import { Response } from 'express';

import { AnyFilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Retrieve current branding settings.',
    description: `Returns the site name, primary colors, and asset URLs.
    **Curl Example:**
    \`\`\`bash
    curl -X GET http://localhost:5001/api/v1/settings/branding \\
    -H "Authorization: Bearer YOUR_TOKEN"
    \`\`\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Branding settings retrieved.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: { siteName: 'ItalianMaster', primaryColor: '#FF0000' },
      },
    },
  })
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
    summary: 'Update branding settings (multipart).',
    description: `Update colors, fonts, and upload logo/favicon.
    **Curl Example:**
    \`\`\`bash
    curl -X PATCH http://localhost:5001/api/v1/settings/branding \\
    -H "Authorization: Bearer YOUR_TOKEN" \\
    -F "siteName=ItalianMaster" \\
    -F "logo=@logo.png"
    \`\`\``,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateBrandingDto })
  @ApiResponse({ status: 200, description: 'Branding updated successfully.' })
  async updateBranding(
    @Body() dto: UpdateBrandingDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    const updatedBranding = await this.brandingService.updateBranding(
      dto,
      files,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Branding settings updated successfully.',
      data: updatedBranding,
    });
  }
}
