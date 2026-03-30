import { FirebaseError } from 'firebase/app';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DailyRecord } from '../types/record';

interface StoredRecord {
  text?: string;
  createdAt?: number;
}

function recordsCollection(uid: string) {
  return collection(db, 'users', uid, 'records');
}

function mapRecordError(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return '기록을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
  }

  switch (error.code) {
    case 'permission-denied':
      return '기록 저장 권한이 없습니다. Firebase 규칙을 확인해주세요.';
    case 'unavailable':
      return 'Firebase 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.';
    default:
      return '기록을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
  }
}

function deserializeRecord(id: string, data: StoredRecord): DailyRecord {
  return {
    id,
    text: data.text ?? '',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
  };
}

export function subscribeRecords(
  uid: string,
  onData: (records: DailyRecord[]) => void,
  onError?: (message: string) => void,
) {
  const recordsQuery = query(recordsCollection(uid), orderBy('createdAt', 'desc'));

  return onSnapshot(
    recordsQuery,
    (snapshot) => {
      const records = snapshot.docs.map((recordDoc) =>
        deserializeRecord(recordDoc.id, recordDoc.data() as StoredRecord),
      );
      onData(records);
    },
    (error) => {
      onError?.(mapRecordError(error));
    },
  );
}

export async function addRecord(uid: string, text: string) {
  try {
    await addDoc(recordsCollection(uid), {
      text,
      createdAt: Date.now(),
    });
  } catch (error) {
    throw new Error(mapRecordError(error));
  }
}

export async function deleteRecord(uid: string, recordId: string) {
  try {
    await deleteDoc(doc(db, 'users', uid, 'records', recordId));
  } catch (error) {
    throw new Error(mapRecordError(error));
  }
}
