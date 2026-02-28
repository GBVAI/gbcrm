export enum WildixUserVarKeys {
  WILDIX_MVP_LINK = 'WILDIX_MVP_LINK',
}

export type WildixMvpLink = {
  wildixExtension: string;
  wildixUserId: string | null;
  wildixEmailSeen: string;
  wildixName: string | null;
  lastVerifiedAt: string;
};

export type WildixUserVarKeyValueType = {
  [WildixUserVarKeys.WILDIX_MVP_LINK]: WildixMvpLink;
};
