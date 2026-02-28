import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  GatewayTimeoutException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';

import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { OriginateCallDto } from 'src/modules/wildix/dtos/originate-call.dto';
import {
  WildixApiError,
  WildixCallControlService,
  WildixConfigurationError,
  WildixIdentityResolutionError,
  WildixMappingStatus,
} from 'src/modules/wildix/services/wildix-call-control.service';

type WildixActionResponse = {
  success: boolean;
  message: string;
};

@Controller('rest/wildix/calls')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, NoPermissionGuard)
export class WildixCallControlController {
  constructor(
    private readonly wildixCallControlService: WildixCallControlService,
  ) {}

  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getStatus(
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<{
    configured: boolean;
    mappingStatus: WildixMappingStatus;
  }> {
    const configured = this.wildixCallControlService.isConfigured();

    if (!configured) {
      return {
        configured: false,
        mappingStatus: 'stale',
      };
    }

    const mappingStatus =
      await this.wildixCallControlService.getMappingStatusForUser({
        userId: user.id,
        workspaceId: workspace.id,
        userEmail: user.email,
      });

    return {
      configured,
      mappingStatus,
    };
  }

  @Post('originate')
  @HttpCode(HttpStatus.OK)
  async originateCall(
    @Body() body: OriginateCallDto,
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<{
    success: boolean;
    message: string;
    wildixResponseType: 'result';
  }> {
    try {
      return await this.wildixCallControlService.originateCall(
        {
          userId: user.id,
          workspaceId: workspace.id,
          userEmail: user.email,
        },
        body.destination,
      );
    } catch (error) {
      this.throwMappedHttpError(error);
    }
  }

  @Get('active')
  @HttpCode(HttpStatus.OK)
  async listActiveCalls(
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<{
    calls: Awaited<ReturnType<WildixCallControlService['listActiveCalls']>>;
  }> {
    try {
      const calls = await this.wildixCallControlService.listActiveCalls({
        userId: user.id,
        workspaceId: workspace.id,
        userEmail: user.email,
      });

      return { calls };
    } catch (error) {
      this.throwMappedHttpError(error);
    }
  }

  @Post(':sipCallId/hangup')
  @HttpCode(HttpStatus.OK)
  async hangupCall(
    @Param('sipCallId') sipCallId: string,
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<WildixActionResponse> {
    try {
      const message = await this.wildixCallControlService.hangupCall(
        {
          userId: user.id,
          workspaceId: workspace.id,
          userEmail: user.email,
        },
        sipCallId,
      );

      return { success: true, message };
    } catch (error) {
      this.throwMappedHttpError(error);
    }
  }

  @Post(':sipCallId/hold')
  @HttpCode(HttpStatus.OK)
  async holdCall(
    @Param('sipCallId') sipCallId: string,
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<WildixActionResponse> {
    try {
      const message = await this.wildixCallControlService.holdCall(
        {
          userId: user.id,
          workspaceId: workspace.id,
          userEmail: user.email,
        },
        sipCallId,
      );

      return { success: true, message };
    } catch (error) {
      this.throwMappedHttpError(error);
    }
  }

  @Post(':sipCallId/unhold')
  @HttpCode(HttpStatus.OK)
  async unholdCall(
    @Param('sipCallId') sipCallId: string,
    @AuthUser() user: UserEntity,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<WildixActionResponse> {
    try {
      const message = await this.wildixCallControlService.unholdCall(
        {
          userId: user.id,
          workspaceId: workspace.id,
          userEmail: user.email,
        },
        sipCallId,
      );

      return { success: true, message };
    } catch (error) {
      this.throwMappedHttpError(error);
    }
  }

  private throwMappedHttpError(error: unknown): never {
    if (error instanceof WildixConfigurationError) {
      throw new ServiceUnavailableException({
        success: false,
        code: 'configuration-missing',
        message: error.message,
      });
    }

    if (error instanceof WildixIdentityResolutionError) {
      throw new BadRequestException({
        success: false,
        code: error.code,
        message: error.message,
      });
    }

    if (error instanceof WildixApiError) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        throw new ServiceUnavailableException({
          success: false,
          code: 'auth-failed',
          message: 'Wildix authentication failed',
        });
      }

      if (error.statusCode === 404) {
        throw new NotFoundException({
          success: false,
          code: 'not-found',
          message: error.message,
        });
      }

      if (error.statusCode === 400 || error.statusCode === 422) {
        throw new BadRequestException({
          success: false,
          code: 'invalid-request',
          message: error.message,
        });
      }

      if (error.statusCode === 504) {
        throw new GatewayTimeoutException({
          success: false,
          code: 'timeout',
          message: error.message,
        });
      }

      throw new BadGatewayException({
        success: false,
        code: 'wildix-error',
        message: error.message,
      });
    }

    throw error;
  }
}
