import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { contextStoreCurrentObjectMetadataItemIdComponentState } from '@/context-store/states/contextStoreCurrentObjectMetadataItemIdComponentState';
import { contextStoreCurrentPageTypeComponentState } from '@/context-store/states/contextStoreCurrentPageTypeComponentState';
import { contextStoreNumberOfSelectedRecordsComponentState } from '@/context-store/states/contextStoreNumberOfSelectedRecordsComponentState';
import { contextStoreTargetedRecordsRuleComponentState } from '@/context-store/states/contextStoreTargetedRecordsRuleComponentState';
import { ContextStoreViewType } from '@/context-store/types/ContextStoreViewType';
import { SIDE_PANEL_COMPONENT_INSTANCE_ID } from '@/side-panel/constants/SidePanelComponentInstanceId';
import { useOpenEmailThreadInSidePanel } from '@/side-panel/hooks/useOpenEmailThreadInSidePanel';
import { viewableRecordIdComponentState } from '@/side-panel/pages/record-page/states/viewableRecordIdComponentState';
import { viewableRecordNameSingularComponentState } from '@/side-panel/pages/record-page/states/viewableRecordNameSingularComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import {
  ContextStorePageType,
  CoreObjectNameSingular,
  SidePanelPages,
} from 'twenty-shared/types';
import { getJestMetadataAndApolloMocksAndCommandMenuWrapper } from '~/testing/jest/getJestMetadataAndApolloMocksAndCommandMenuWrapper';
import { getTestEnrichedObjectMetadataItemsMock } from '~/testing/utils/getTestEnrichedObjectMetadataItemsMock';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

const mockNavigateSidePanel = jest.fn();
jest.mock('@/side-panel/hooks/useNavigateSidePanel', () => ({
  useNavigateSidePanel: () => ({
    navigateSidePanel: mockNavigateSidePanel,
  }),
}));

const mockOpenNewRecordTitleCell = jest.fn();
jest.mock(
  '@/object-record/record-title-cell/hooks/useOpenNewRecordTitleCell',
  () => ({
    useOpenNewRecordTitleCell: () => ({
      openNewRecordTitleCell: mockOpenNewRecordTitleCell,
    }),
  }),
);

const messageThreadMockObjectMetadataItem =
  getTestEnrichedObjectMetadataItemsMock().find(
    (item) => item.nameSingular === CoreObjectNameSingular.MessageThread,
  )!;

const wrapper = getJestMetadataAndApolloMocksAndCommandMenuWrapper({
  apolloMocks: [],
  componentInstanceId: SIDE_PANEL_COMPONENT_INSTANCE_ID,
  contextStoreCurrentObjectMetadataNameSingular:
    messageThreadMockObjectMetadataItem.nameSingular,
  contextStoreCurrentViewId: 'my-view-id',
  contextStoreTargetedRecordsRule: {
    mode: 'selection',
    selectedRecordIds: [],
  },
  contextStoreNumberOfSelectedRecords: 0,
  contextStoreCurrentViewType: ContextStoreViewType.Table,
});

const renderHooks = () => {
  const { result } = renderHook(
    () => {
      const { openEmailThreadInSidePanel } = useOpenEmailThreadInSidePanel();

      const viewableRecordId = useAtomComponentStateValue(
        viewableRecordIdComponentState,
        'mocked-uuid',
      );
      const viewableRecordNameSingular = useAtomComponentStateValue(
        viewableRecordNameSingularComponentState,
        'mocked-uuid',
      );
      const contextStoreCurrentObjectMetadataItemId =
        useAtomComponentStateValue(
          contextStoreCurrentObjectMetadataItemIdComponentState,
          'mocked-uuid',
        );
      const contextStoreTargetedRecordsRule = useAtomComponentStateValue(
        contextStoreTargetedRecordsRuleComponentState,
        'mocked-uuid',
      );
      const contextStoreNumberOfSelectedRecords = useAtomComponentStateValue(
        contextStoreNumberOfSelectedRecordsComponentState,
        'mocked-uuid',
      );
      const contextStoreCurrentPageType = useAtomComponentStateValue(
        contextStoreCurrentPageTypeComponentState,
        'mocked-uuid',
      );

      return {
        openEmailThreadInSidePanel,
        viewableRecordId,
        viewableRecordNameSingular,
        contextStoreCurrentObjectMetadataItemId,
        contextStoreTargetedRecordsRule,
        contextStoreNumberOfSelectedRecords,
        contextStoreCurrentPageType,
      };
    },
    {
      wrapper,
    },
  );
  return { result };
};

describe('useOpenEmailThreadInSidePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should open the email thread as a standard record page', () => {
    // A message thread is a real record, so this must open the messageThread
    // record page — not a bespoke panel like useOpenComposeEmailInSidePanel does.
    const { result } = renderHooks();

    const messageThreadId = 'message-thread-123';

    act(() => {
      result.current.openEmailThreadInSidePanel(messageThreadId);
    });

    expect(result.current.viewableRecordId).toBe(messageThreadId);
    expect(result.current.viewableRecordNameSingular).toBe(
      CoreObjectNameSingular.MessageThread,
    );
    expect(result.current.contextStoreCurrentObjectMetadataItemId).toBe(
      messageThreadMockObjectMetadataItem.id,
    );
    expect(result.current.contextStoreTargetedRecordsRule).toEqual({
      mode: 'selection',
      selectedRecordIds: [messageThreadId],
    });
    expect(result.current.contextStoreNumberOfSelectedRecords).toBe(1);
    expect(result.current.contextStoreCurrentPageType).toBe(
      ContextStorePageType.Record,
    );

    expect(mockNavigateSidePanel).toHaveBeenCalledWith(
      expect.objectContaining({
        page: SidePanelPages.ViewRecord,
        pageId: 'mocked-uuid',
      }),
    );
  });
});
