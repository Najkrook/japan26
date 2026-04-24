import authorizedUploaders from './authorizedUploaders.json';
import type { HardcodedAccountProfile } from '../types';

// Admin upload access is configured in authorizedUploaders.json.
export const HARDCODED_ACCOUNT_LIST = authorizedUploaders as HardcodedAccountProfile[];
export const AUTHORIZED_UPLOADER_UIDS = HARDCODED_ACCOUNT_LIST.map((account) => account.uid);

export const getHardcodedAccountByUid = (uid: string): HardcodedAccountProfile | null =>
  HARDCODED_ACCOUNT_LIST.find((account) => account.uid === uid) ?? null;
