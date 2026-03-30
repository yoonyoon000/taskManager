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
import { db } from './firebase';
import { ProjectItem, ProjectLog } from '../types/project';

interface StoredProject {
  name?: string;
  createdAt?: number;
}

interface StoredLog {
  text?: string;
  createdAt?: number;
}

function projectsCollection(uid: string) {
  return collection(db, 'users', uid, 'projects');
}

function logsCollection(uid: string, projectId: string) {
  return collection(db, 'users', uid, 'projects', projectId, 'logs');
}

function mapErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return '데이터를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
  }

  switch (error.code) {
    case 'permission-denied':
      return 'Firebase 권한이 없어 데이터를 불러오거나 저장할 수 없습니다.';
    case 'unavailable':
      return 'Firebase 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.';
    default:
      return '데이터를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
  }
}

function toProject(id: string, data: StoredProject): ProjectItem {
  return {
    id,
    name: data.name ?? '이름 없는 프로젝트',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
  };
}

function toLog(id: string, data: StoredLog): ProjectLog {
  return {
    id,
    text: data.text ?? '',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
  };
}

export function subscribeProjects(
  uid: string,
  onData: (projects: ProjectItem[]) => void,
  onError?: (message: string) => void,
) {
  const projectsQuery = query(projectsCollection(uid), orderBy('createdAt', 'desc'));

  return onSnapshot(
    projectsQuery,
    (snapshot) => {
      onData(snapshot.docs.map((item) => toProject(item.id, item.data() as StoredProject)));
    },
    (error) => {
      onError?.(mapErrorMessage(error));
    },
  );
}

export function subscribeLogs(
  uid: string,
  projectId: string,
  onData: (logs: ProjectLog[]) => void,
  onError?: (message: string) => void,
) {
  const logsQuery = query(logsCollection(uid, projectId), orderBy('createdAt', 'desc'));

  return onSnapshot(
    logsQuery,
    (snapshot) => {
      onData(snapshot.docs.map((item) => toLog(item.id, item.data() as StoredLog)));
    },
    (error) => {
      onError?.(mapErrorMessage(error));
    },
  );
}

export async function createProject(uid: string, name: string) {
  try {
    await addDoc(projectsCollection(uid), {
      name,
      createdAt: Date.now(),
    });
  } catch (error) {
    throw new Error(mapErrorMessage(error));
  }
}

export async function addLog(uid: string, projectId: string, text: string) {
  try {
    await addDoc(logsCollection(uid, projectId), {
      text,
      createdAt: Date.now(),
    });
  } catch (error) {
    throw new Error(mapErrorMessage(error));
  }
}

export async function deleteLog(uid: string, projectId: string, logId: string) {
  try {
    await deleteDoc(doc(db, 'users', uid, 'projects', projectId, 'logs', logId));
  } catch (error) {
    throw new Error(mapErrorMessage(error));
  }
}
