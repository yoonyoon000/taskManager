import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

function getAuthErrorMessage(error: unknown, mode: 'login' | 'signup') {
  if (!(error instanceof FirebaseError)) {
    return mode === 'login'
      ? '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
      : '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.';
  }

  switch (error.code) {
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않습니다.';
    case 'auth/user-disabled':
      return '사용할 수 없는 계정입니다.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'auth/email-already-in-use':
      return '이미 사용 중인 이메일입니다.';
    case 'auth/weak-password':
      return '비밀번호는 6자 이상 입력해주세요.';
    case 'auth/too-many-requests':
      return '요청이 많습니다. 잠시 후 다시 시도해주세요.';
    default:
      return mode === 'login'
        ? '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
        : '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.';
  }
}

export async function signUp(email: string, password: string) {
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error, 'signup'));
  }
}

export async function login(email: string, password: string) {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error, 'login'));
  }
}

export async function logout() {
  return signOut(auth);
}
