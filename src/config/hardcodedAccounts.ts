import type { HardcodedAccountProfile } from '../types';

export const HARDCODED_ACCOUNT_LIST: HardcodedAccountProfile[] = [
  {
    uid: 'dGcKysUwFZNfkur2SS3G2UERX242',
    name: 'Najk',
    role: 'admin',
  },
  {
    uid: 'VALLE_UID_PLACEHOLDER',
    name: 'Valle',
    role: 'poster',
  },
  {
    uid: 'FILLE_UID_PLACEHOLDER',
    name: 'Fille',
    role: 'poster',
  },
  {
    uid: 'VARING_UID_PLACEHOLDER',
    name: 'Våring',
    role: 'poster',
  },
  {
    uid: 'DRUFFE_UID_PLACEHOLDER',
    name: 'Druffe',
    role: 'poster',
  },
];

export const getHardcodedAccountByUid = (uid: string): HardcodedAccountProfile | null =>
  HARDCODED_ACCOUNT_LIST.find((account) => account.uid === uid) ?? null;
