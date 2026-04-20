import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CreateDayInput, Day, UpdateDayInput } from '../types';
import { formatDateKey, formatDateSwedish, startOfDay } from '../utils/dateHelpers';
import { mapDay } from '../utils/firestoreMappers';

interface DaysState {
  loaded: boolean;
  days: Day[];
  error: string | null;
}

const buildDayPayload = (input: CreateDayInput) => {
  const normalizedDate = startOfDay(input.date);
  return {
    date: Timestamp.fromDate(normalizedDate),
    dateKey: formatDateKey(normalizedDate),
    title: input.title?.trim() || formatDateSwedish(normalizedDate),
    description: input.description?.trim() || '',
    itinerary: input.itinerary?.trim() || '',
  };
};

export const useDays = () => {
  const [state, setState] = useState<DaysState>({
    loaded: false,
    days: [],
    error: null,
  });

  useEffect(() => {
    const daysQuery = query(collection(db, 'days'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(
      daysQuery,
      (snapshot) => {
        setState({
          loaded: true,
          days: snapshot.docs.map(mapDay),
          error: null,
        });
      },
      () => {
        setState({
          loaded: true,
          days: [],
          error: 'Kunde inte ladda dagar.',
        });
      },
    );

    return () => unsubscribe();
  }, []);

  const createDay = async (input: CreateDayInput) => {
    const normalizedDate = startOfDay(input.date);
    const dayId = formatDateKey(normalizedDate);
    const dayRef = doc(db, 'days', dayId);
    const existing = await getDoc(dayRef);

    if (existing.exists()) {
      throw new Error('Den dagen finns redan.');
    }

    await setDoc(dayRef, {
      ...buildDayPayload(input),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return dayId;
  };

  const updateDay = async (dayId: string, patch: UpdateDayInput) => {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (patch.title !== undefined) {
      payload.title = patch.title.trim();
    }

    if (patch.description !== undefined) {
      payload.description = patch.description.trim();
    }

    if (patch.location !== undefined) {
      payload.location = patch.location.trim();
    }

    if (patch.itinerary !== undefined) {
      payload.itinerary = patch.itinerary.trim();
    }

    await updateDoc(doc(db, 'days', dayId), payload);
  };

  const deleteDay = async (dayId: string) => {
    await deleteDoc(doc(db, 'days', dayId));
  };

  const ensureDay = async (date: Date) => {
    const normalizedDate = startOfDay(date);
    const dayId = formatDateKey(normalizedDate);
    const dayRef = doc(db, 'days', dayId);
    const existing = await getDoc(dayRef);

    if (!existing.exists()) {
      await setDoc(dayRef, {
        ...buildDayPayload({ date: normalizedDate }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return dayId;
  };

  return {
    days: state.days,
    loading: !state.loaded,
    error: state.error,
    createDay,
    updateDay,
    deleteDay,
    ensureDay,
  };
};
