import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserVarsService } from 'src/engine/core-modules/user/user-vars/services/user-vars.service';
import {
  WildixMvpLink,
  WildixUserVarKeys,
  WildixUserVarKeyValueType,
} from 'src/modules/wildix/types/wildix-user-vars.type';

type WildixCallControlContext = {
  userId: string;
  workspaceId: string;
  userEmail: string;
};

type WildixColleague = {
  id?: string;
  extension?: string;
  email?: string;
  name?: string;
};

type WildixGetPbxColleaguesResponse = {
  type?: 'result' | 'error';
  reason?: string;
  result?: {
    records?: WildixColleague[];
    total?: number;
  };
};

type WildixCallControlResponse = {
  message?: string;
};

type WildixOriginateResult = {
  success: true;
  message: string;
  wildixResponseType: 'result';
};

export type WildixMappingStatus = 'linked' | 'not-found' | 'ambiguous' | 'stale';

export type WildixActiveCall = {
  sipCallId: string;
  callerNumber: string;
  callerName: string;
  calleeNumber: string;
  calleeName: string;
  state: string;
  duration: number;
};

type WildixListCallsResponse = {
  calls?: WildixActiveCall[];
};

export class WildixConfigurationError extends Error {}

export class WildixIdentityResolutionError extends Error {
  constructor(
    public readonly code: 'not-found' | 'ambiguous',
    message: string,
  ) {
    super(message);
  }
}

export class WildixApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: unknown,
  ) {
    super(message);
  }
}

@Injectable()
export class WildixCallControlService {
  protected readonly logger = new Logger(WildixCallControlService.name);

  constructor(
    private readonly twentyConfigService: TwentyConfigService,
    private readonly userVarsService: UserVarsService<WildixUserVarKeyValueType>,
  ) {}

  public isConfigured(): boolean {
    const domain = this.twentyConfigService.get('WILDIX_WMS_DOMAIN');
    const token = this.twentyConfigService.get('WILDIX_WMS_TOKEN');

    return (
      isDefined(domain) &&
      domain.trim() !== '' &&
      isDefined(token) &&
      token.trim() !== ''
    );
  }

  public async getMappingStatusForUser(
    context: WildixCallControlContext,
  ): Promise<WildixMappingStatus> {
    if (!this.isConfigured()) {
      return 'stale';
    }

    try {
      await this.resolveIdentity(context);

      return 'linked';
    } catch (error) {
      if (error instanceof WildixIdentityResolutionError) {
        return error.code;
      }

      this.logger.warn(
        `Failed to resolve Wildix identity status for user ${context.userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return 'stale';
    }
  }

  public async originateCall(
    context: WildixCallControlContext,
    destination: string,
  ): Promise<WildixOriginateResult> {
    const normalizedDestination = destination.trim();

    if (normalizedDestination === '') {
      throw new WildixApiError('Destination is required', 400, null);
    }

    return this.withResolvedIdentity(context, async (identity) => {
      const response = await this.request<WildixCallControlResponse>({
        method: 'POST',
        path: '/api/v2/call-control/make-call',
        query: {
          user: identity.wildixExtension,
        },
        body: {
          destination: normalizedDestination,
        },
      });

      return {
        success: true as const,
        message: response.message ?? 'Call originate accepted',
        wildixResponseType: 'result' as const,
      };
    });
  }

  public async listActiveCalls(
    context: WildixCallControlContext,
  ): Promise<WildixActiveCall[]> {
    return this.withResolvedIdentity(context, async (identity) => {
      const response = await this.request<WildixListCallsResponse>({
        method: 'GET',
        path: '/api/v2/call-control/list-calls',
        query: {
          user: identity.wildixExtension,
        },
      });

      const calls = Array.isArray(response.calls) ? response.calls : [];

      return calls.map((call) => ({
        sipCallId: String(call.sipCallId ?? ''),
        callerNumber: String(call.callerNumber ?? ''),
        callerName: String(call.callerName ?? ''),
        calleeNumber: String(call.calleeNumber ?? ''),
        calleeName: String(call.calleeName ?? ''),
        state: String(call.state ?? ''),
        duration: Number(call.duration ?? 0),
      }));
    });
  }

  public async hangupCall(
    context: WildixCallControlContext,
    sipCallId: string,
  ): Promise<string> {
    return this.runCallControlAction({
      context,
      path: '/api/v2/call-control/hangup',
      sipCallId,
      body: { sipCallId, reason: 'normal' },
      successMessage: 'Call hung up',
    });
  }

  public async holdCall(
    context: WildixCallControlContext,
    sipCallId: string,
  ): Promise<string> {
    return this.runCallControlAction({
      context,
      path: '/api/v2/call-control/hold',
      sipCallId,
      body: { sipCallId },
      successMessage: 'Call on hold',
    });
  }

  public async unholdCall(
    context: WildixCallControlContext,
    sipCallId: string,
  ): Promise<string> {
    return this.runCallControlAction({
      context,
      path: '/api/v2/call-control/unhold',
      sipCallId,
      body: { sipCallId },
      successMessage: 'Call resumed',
    });
  }

  private async runCallControlAction({
    context,
    path,
    sipCallId,
    body,
    successMessage,
  }: {
    context: WildixCallControlContext;
    path: string;
    sipCallId: string;
    body: Record<string, string>;
    successMessage: string;
  }): Promise<string> {
    const normalizedSipCallId = sipCallId.trim();

    if (normalizedSipCallId === '') {
      throw new WildixApiError('sipCallId is required', 400, null);
    }

    const normalizedBody = {
      ...body,
      sipCallId: normalizedSipCallId,
    };

    return this.withResolvedIdentity(context, async (identity) => {
      const response = await this.request<WildixCallControlResponse>({
        method: 'POST',
        path,
        query: { user: identity.wildixExtension },
        body: normalizedBody,
      });

      return response.message ?? successMessage;
    });
  }

  private async withResolvedIdentity<T>(
    context: WildixCallControlContext,
    operation: (identity: WildixMvpLink) => Promise<T>,
  ): Promise<T> {
    const identity = await this.resolveIdentity(context);

    try {
      return await operation(identity);
    } catch (error) {
      if (!this.shouldRefreshIdentity(error)) {
        throw error;
      }

      const refreshedIdentity = await this.resolveIdentity(context, true);

      if (
        refreshedIdentity.wildixExtension === identity.wildixExtension &&
        refreshedIdentity.wildixUserId === identity.wildixUserId
      ) {
        throw error;
      }

      return operation(refreshedIdentity);
    }
  }

  private shouldRefreshIdentity(error: unknown): boolean {
    if (!(error instanceof WildixApiError)) {
      return false;
    }

    if (error.statusCode === 404) {
      return true;
    }

    return (
      error.statusCode === 400 && error.message.toLowerCase().includes('channel')
    );
  }

  private async resolveIdentity(
    context: WildixCallControlContext,
    forceRefresh = false,
  ): Promise<WildixMvpLink> {
    this.assertConfiguredOrThrow();

    const normalizedEmail = this.normalizeEmail(context.userEmail);

    if (normalizedEmail === '') {
      throw new WildixIdentityResolutionError(
        'not-found',
        'Current CRM user has no email to match against Wildix',
      );
    }

    if (!forceRefresh) {
      const rawCachedIdentity = await this.userVarsService.get({
        userId: context.userId,
        workspaceId: context.workspaceId,
        key: WildixUserVarKeys.WILDIX_MVP_LINK,
      });
      const cachedIdentity = this.normalizeCachedIdentity(
        rawCachedIdentity,
        normalizedEmail,
      );

      if (isDefined(cachedIdentity)) {
        return cachedIdentity;
      }
    }

    const colleagues = await this.fetchColleaguesByEmail(normalizedEmail);

    if (colleagues.length === 0) {
      throw new WildixIdentityResolutionError(
        'not-found',
        `No Wildix colleague found for email ${normalizedEmail}`,
      );
    }

    if (colleagues.length > 1) {
      throw new WildixIdentityResolutionError(
        'ambiguous',
        `Multiple Wildix colleagues found for email ${normalizedEmail}`,
      );
    }

    const colleague = colleagues[0];
    const extension = String(colleague.extension ?? '').trim();

    if (extension === '') {
      throw new WildixIdentityResolutionError(
        'not-found',
        `Wildix colleague for ${normalizedEmail} has no extension`,
      );
    }

    const link: WildixMvpLink = {
      wildixExtension: extension,
      wildixUserId: isDefined(colleague.id) ? String(colleague.id) : null,
      wildixEmailSeen: normalizedEmail,
      wildixName: isDefined(colleague.name) ? String(colleague.name) : null,
      lastVerifiedAt: new Date().toISOString(),
    };

    await this.userVarsService.set({
      userId: context.userId,
      workspaceId: context.workspaceId,
      key: WildixUserVarKeys.WILDIX_MVP_LINK,
      value: link,
    });

    return link;
  }

  private async fetchColleaguesByEmail(
    normalizedEmail: string,
  ): Promise<WildixColleague[]> {
    const response = await this.request<WildixGetPbxColleaguesResponse>({
      method: 'GET',
      path: '/api/v1/PBX/Colleagues',
      query: {
        'filter[email][]': normalizedEmail,
        fields: 'id,extension,email,name',
        count: '10',
      },
    });

    if (response.type === 'error') {
      throw new WildixApiError(
        response.reason ?? 'Wildix colleague lookup failed',
        400,
        response,
      );
    }

    const records = response.result?.records ?? [];
    const exactMatches = records.filter(
      (record) =>
        this.normalizeEmail(String(record.email ?? '')) === normalizedEmail,
    );

    const deduplicatedByExtension = new Map<string, WildixColleague>();

    for (const record of exactMatches) {
      const extension = String(record.extension ?? '').trim();
      const colleagueId = String(record.id ?? '').trim();
      const dedupeKey =
        extension !== ''
          ? `extension:${extension}`
          : colleagueId !== ''
            ? `id:${colleagueId}`
            : `raw:${JSON.stringify(record)}`;

      if (!deduplicatedByExtension.has(dedupeKey)) {
        deduplicatedByExtension.set(dedupeKey, record);
      }
    }

    return Array.from(deduplicatedByExtension.values());
  }

  private assertConfiguredOrThrow(): void {
    if (!this.isConfigured()) {
      throw new WildixConfigurationError(
        'Wildix click-to-call is not configured (WILDIX_WMS_DOMAIN/WILDIX_WMS_TOKEN missing)',
      );
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeCachedIdentity(
    cachedIdentity: unknown,
    normalizedEmail: string,
  ): WildixMvpLink | null {
    if (!isDefined(cachedIdentity) || typeof cachedIdentity !== 'object') {
      return null;
    }

    const maybeIdentity = cachedIdentity as Record<string, unknown>;
    const maybeExtension =
      typeof maybeIdentity.wildixExtension === 'string'
        ? maybeIdentity.wildixExtension.trim()
        : '';
    const maybeEmailSeen =
      typeof maybeIdentity.wildixEmailSeen === 'string'
        ? this.normalizeEmail(maybeIdentity.wildixEmailSeen)
        : '';

    if (
      maybeExtension === '' ||
      maybeEmailSeen === '' ||
      maybeEmailSeen !== normalizedEmail
    ) {
      return null;
    }

    return {
      wildixExtension: maybeExtension,
      wildixUserId:
        typeof maybeIdentity.wildixUserId === 'string'
          ? maybeIdentity.wildixUserId
          : null,
      wildixEmailSeen: maybeEmailSeen,
      wildixName:
        typeof maybeIdentity.wildixName === 'string'
          ? maybeIdentity.wildixName
          : null,
      lastVerifiedAt:
        typeof maybeIdentity.lastVerifiedAt === 'string' &&
        maybeIdentity.lastVerifiedAt !== ''
          ? maybeIdentity.lastVerifiedAt
          : new Date().toISOString(),
    };
  }

  private getBaseUrl(): string {
    const rawDomain = this.twentyConfigService.get('WILDIX_WMS_DOMAIN');

    if (!isDefined(rawDomain) || rawDomain.trim() === '') {
      throw new WildixConfigurationError(
        'WILDIX_WMS_DOMAIN is not configured',
      );
    }

    const strippedDomain = rawDomain
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '')
      .toLowerCase();

    const hostname = strippedDomain.endsWith('wildixin.com')
      ? strippedDomain
      : `${strippedDomain}.wildixin.com`;

    return `https://${hostname}`;
  }

  private getAuthorizationHeader(): string {
    const token = this.twentyConfigService.get('WILDIX_WMS_TOKEN');

    if (!isDefined(token) || token.trim() === '') {
      throw new WildixConfigurationError('WILDIX_WMS_TOKEN is not configured');
    }

    const trimmedToken = token.trim();

    return trimmedToken.toLowerCase().startsWith('bearer ')
      ? trimmedToken
      : `Bearer ${trimmedToken}`;
  }

  private async request<T>({
    method,
    path,
    query,
    body,
  }: {
    method: 'GET' | 'POST';
    path: string;
    query?: Record<string, string>;
    body?: Record<string, string>;
  }): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: this.getAuthorizationHeader(),
    };

    if (isDefined(body)) {
      headers['Content-Type'] = 'application/json';
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 10_000);

    try {
      const url = new URL(path, this.getBaseUrl());

      if (isDefined(query)) {
        for (const [key, value] of Object.entries(query)) {
          url.searchParams.append(key, value);
        }
      }

      const response = await fetch(url, {
        method,
        headers,
        body: isDefined(body) ? JSON.stringify(body) : undefined,
        signal: abortController.signal,
      });
      const text = await response.text();
      let parsedBody: unknown = null;

      if (text !== '') {
        try {
          parsedBody = JSON.parse(text);
        } catch {
          parsedBody = text;
        }
      }

      if (!response.ok) {
        throw new WildixApiError(
          this.extractWildixErrorMessage(parsedBody, response.status),
          response.status,
          parsedBody,
        );
      }

      return (parsedBody ?? {}) as T;
    } catch (error) {
      if (error instanceof WildixApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new WildixApiError('Wildix API request timed out', 504, null);
      }

      throw new WildixApiError(
        `Wildix API request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        502,
        null,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractWildixErrorMessage(body: unknown, statusCode: number): string {
    if (typeof body === 'string' && body !== '') {
      return body;
    }

    if (isDefined(body) && typeof body === 'object') {
      const maybeBody = body as Record<string, unknown>;

      if (typeof maybeBody.message === 'string' && maybeBody.message !== '') {
        return maybeBody.message;
      }

      if (typeof maybeBody.reason === 'string' && maybeBody.reason !== '') {
        return maybeBody.reason;
      }

      if (
        Array.isArray(maybeBody.errors) &&
        maybeBody.errors.length > 0 &&
        typeof maybeBody.errors[0] === 'object' &&
        isDefined(maybeBody.errors[0])
      ) {
        const firstError = maybeBody.errors[0] as Record<string, unknown>;

        if (typeof firstError.message === 'string' && firstError.message !== '') {
          return firstError.message;
        }
      }
    }

    return `Wildix API request failed with status ${statusCode}`;
  }
}
