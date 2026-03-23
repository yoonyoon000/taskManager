import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

function encodeUserId(userId: string) {
  return Array.from(new TextEncoder().encode(userId))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function buildCredential(userId: string) {
  const encoded = encodeUserId(userId.trim());

  return {
    email: `u_${encoded}@taskmanager.local`,
    password: `TaskManager!${encoded}!2026`,
  };
}

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return '아이디로 시작하지 못했습니다. 잠시 후 다시 시도해주세요.';
  }

  switch (error.code) {
    case 'auth/operation-not-allowed':
      return 'Firebase 콘솔에서 이메일/비밀번호 로그인을 먼저 활성화해주세요.';
    case 'auth/network-request-failed':
      return '네트워크 연결을 확인한 뒤 다시 시도해주세요.';
    case 'auth/too-many-requests':
      return '요청이 많습니다. 잠시 후 다시 시도해주세요.';
    default:
      return '아이디로 시작하지 못했습니다. 잠시 후 다시 시도해주세요.';
  }
}

export async function login(userId: string) {
  const trimmedId = userId.trim();

  if (!trimmedId) {
    throw new Error('아이디를 입력해주세요.');
  }

  try {
    const credentialInfo = buildCredential(trimmedId);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        credentialInfo.email,
        credentialInfo.password,
      );

      if (credential.user.displayName !== trimmedId) {
        await updateProfile(credential.user, {
          displayName: trimmedId,
        });
        await credential.user.reload();
      }

      return credential;
    } catch (error) {
      if (
        error instanceof FirebaseError &&
        ['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(
          error.code,
        )
      ) {
        const created = await createUserWithEmailAndPassword(
          auth,
          credentialInfo.email,
          credentialInfo.password,
        );
        await updateProfile(created.user, {
          displayName: trimmedId,
        });
        await created.user.reload();
        return created;
      }

      throw error;
    }
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function logout() {
  return signOut(auth);
}
