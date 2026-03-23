import { FirebaseError } from 'firebase/app';
import { signInAnonymously, signOut, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return '아이디로 시작하지 못했습니다. 잠시 후 다시 시도해주세요.';
  }

  switch (error.code) {
    case 'auth/operation-not-allowed':
      return 'Firebase 콘솔에서 익명 로그인을 먼저 활성화해주세요.';
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
    const credential = await signInAnonymously(auth);
    await updateProfile(credential.user, {
      displayName: trimmedId,
    });
    await credential.user.reload();
    return credential;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function logout() {
  return signOut(auth);
}
