import { FirebaseError } from 'firebase/app';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  writeBatch,
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

export interface WorkspaceSnapshot {
  projects: ProjectItem[];
  logsByProject: Record<string, ProjectLog[]>;
}

function projectsCollection(uid: string) {
  return collection(db, 'users', uid, 'projects');
}

function projectDoc(uid: string, projectId: string) {
  return doc(db, 'users', uid, 'projects', projectId);
}

function logsCollection(uid: string, projectId: string) {
  return collection(db, 'users', uid, 'projects', projectId, 'logs');
}

function logDoc(uid: string, projectId: string, logId: string) {
  return doc(db, 'users', uid, 'projects', projectId, 'logs', logId);
}

function mapErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return '데이터를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
  }

  switch (error.code) {
    case 'permission-denied':
      return 'Firebase 권한이 없어 데이터를 저장하거나 불러올 수 없습니다.';
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

export async function getWorkspace(uid: string) {
  try {
    const projectsQuery = query(projectsCollection(uid), orderBy('createdAt', 'desc'));
    const projectsSnapshot = await getDocs(projectsQuery);
    const projects = projectsSnapshot.docs.map((item) =>
      toProject(item.id, item.data() as StoredProject),
    );

    const logsByProject: Record<string, ProjectLog[]> = {};

    await Promise.all(
      projects.map(async (project) => {
        const logsQuery = query(logsCollection(uid, project.id), orderBy('createdAt', 'desc'));
        const logsSnapshot = await getDocs(logsQuery);
        logsByProject[project.id] = logsSnapshot.docs.map((item) =>
          toLog(item.id, item.data() as StoredLog),
        );
      }),
    );

    return {
      projects,
      logsByProject,
    } as WorkspaceSnapshot;
  } catch (error) {
    throw new Error(mapErrorMessage(error));
  }
}

export async function saveWorkspace(uid: string, workspace: WorkspaceSnapshot) {
  try {
    const existingProjects = await getDocs(projectsCollection(uid));
    const deleteBatch = writeBatch(db);

    await Promise.all(
      existingProjects.docs.map(async (projectSnapshot) => {
        const logsSnapshot = await getDocs(logsCollection(uid, projectSnapshot.id));
        logsSnapshot.docs.forEach((logSnapshot) => {
          deleteBatch.delete(logDoc(uid, projectSnapshot.id, logSnapshot.id));
        });
        deleteBatch.delete(projectDoc(uid, projectSnapshot.id));
      }),
    );

    await deleteBatch.commit();

    const saveBatch = writeBatch(db);

    workspace.projects.forEach((project) => {
      saveBatch.set(projectDoc(uid, project.id), {
        name: project.name,
        createdAt: project.createdAt,
      });

      (workspace.logsByProject[project.id] ?? []).forEach((log) => {
        saveBatch.set(logDoc(uid, project.id, log.id), {
          text: log.text,
          createdAt: log.createdAt,
        });
      });
    });

    await saveBatch.commit();
  } catch (error) {
    throw new Error(mapErrorMessage(error));
  }
}
