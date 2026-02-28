import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserVarsService } from 'src/engine/core-modules/user/user-vars/services/user-vars.service';
import { WildixCallControlService } from 'src/modules/wildix/services/wildix-call-control.service';
import { WildixUserVarKeyValueType } from 'src/modules/wildix/types/wildix-user-vars.type';

const createMockResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  }) as unknown as Response;

describe('WildixCallControlService', () => {
  const context = {
    userId: 'user-id',
    workspaceId: 'workspace-id',
    userEmail: 'agent@gbviaggi.it',
  };

  const mockConfigGet = jest.fn(
    (key: string): string | undefined => {
      switch (key) {
        case 'WILDIX_WMS_DOMAIN':
          return 'gbhotels.wildixin.com';
        case 'WILDIX_WMS_TOKEN':
          return 'access_mws_abc';
        default:
          return undefined;
      }
    },
  );

  const mockUserVarsGet = jest.fn();
  const mockUserVarsSet = jest.fn();

  const twentyConfigService = {
    get: mockConfigGet,
  } as unknown as TwentyConfigService;

  const userVarsService = {
    get: mockUserVarsGet,
    set: mockUserVarsSet,
  } as unknown as UserVarsService<WildixUserVarKeyValueType>;

  let service: WildixCallControlService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WildixCallControlService(twentyConfigService, userVarsService);
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should use cached user linkage for originate call', async () => {
    mockUserVarsGet.mockResolvedValue({
      wildixExtension: '201',
      wildixUserId: '9186639',
      wildixEmailSeen: 'agent@gbviaggi.it',
      wildixName: 'Agent Test',
      lastVerifiedAt: '2026-02-28T12:00:00.000Z',
    });

    (global.fetch as jest.Mock).mockResolvedValue(
      createMockResponse(200, { message: 'Call queued' }),
    );

    const result = await service.originateCall(context, '+393487432338');

    expect(result).toEqual({
      success: true,
      message: 'Call queued',
      wildixResponseType: 'result',
    });
    expect(mockUserVarsSet).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [requestUrl, requestInit] = (global.fetch as jest.Mock).mock.calls[0];

    expect(String(requestUrl)).toContain('/api/v2/call-control/make-call');
    expect(String(requestUrl)).toContain('user=201');
    expect(requestInit.body).toBe(JSON.stringify({ destination: '+393487432338' }));
  });

  it('should resolve linkage by exact email and persist it', async () => {
    mockUserVarsGet.mockResolvedValue(undefined);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        createMockResponse(200, {
          type: 'result',
          result: {
            records: [
              {
                id: '9186639',
                extension: '201',
                email: 'agent@gbviaggi.it',
                name: 'Agent Test',
              },
            ],
            total: 1,
          },
        }),
      )
      .mockResolvedValueOnce(
        createMockResponse(200, {
          calls: [
            {
              sipCallId: 'sip-id-1',
              callerNumber: '201',
              callerName: 'Agent Test',
              calleeNumber: '+393487432338',
              calleeName: 'Mario Rossi',
              state: 'connected',
              duration: 15,
            },
          ],
        }),
      );

    const calls = await service.listActiveCalls(context);

    expect(calls).toEqual([
      {
        sipCallId: 'sip-id-1',
        callerNumber: '201',
        callerName: 'Agent Test',
        calleeNumber: '+393487432338',
        calleeName: 'Mario Rossi',
        state: 'connected',
        duration: 15,
      },
    ]);

    expect(mockUserVarsSet).toHaveBeenCalledTimes(1);
    expect(mockUserVarsSet).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        workspaceId: 'workspace-id',
        key: 'WILDIX_MVP_LINK',
      }),
    );
  });

  it('should ignore malformed cached linkage and re-resolve from Wildix', async () => {
    mockUserVarsGet.mockResolvedValue({
      wildixExtension: 201,
      wildixEmailSeen: null,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        createMockResponse(200, {
          type: 'result',
          result: {
            records: [
              {
                id: '9186639',
                extension: '201',
                email: 'agent@gbviaggi.it',
                name: 'Agent Test',
              },
            ],
            total: 1,
          },
        }),
      )
      .mockResolvedValueOnce(
        createMockResponse(200, {
          calls: [],
        }),
      );

    const calls = await service.listActiveCalls(context);

    expect(calls).toEqual([]);
    expect(mockUserVarsSet).toHaveBeenCalledTimes(1);
  });

  it('should handle malformed list-calls response by returning an empty list', async () => {
    mockUserVarsGet.mockResolvedValue({
      wildixExtension: '201',
      wildixUserId: '9186639',
      wildixEmailSeen: 'agent@gbviaggi.it',
      wildixName: 'Agent Test',
      lastVerifiedAt: '2026-02-28T12:00:00.000Z',
    });

    (global.fetch as jest.Mock).mockResolvedValue(
      createMockResponse(200, {
        calls: {
          sipCallId: 'invalid-shape',
        },
      }),
    );

    const calls = await service.listActiveCalls(context);

    expect(calls).toEqual([]);
  });

  it('should fail closed on ambiguous email match', async () => {
    mockUserVarsGet.mockResolvedValue(undefined);

    (global.fetch as jest.Mock).mockResolvedValue(
      createMockResponse(200, {
        type: 'result',
        result: {
          records: [
            {
              id: '1',
              extension: '201',
              email: 'agent@gbviaggi.it',
            },
            {
              id: '2',
              extension: '202',
              email: 'agent@gbviaggi.it',
            },
          ],
          total: 2,
        },
      }),
    );

    await expect(
      service.originateCall(context, '+393487432338'),
    ).rejects.toMatchObject({
      code: 'ambiguous',
    });
  });
});
