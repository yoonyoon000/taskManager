import { useState } from 'react';
import { login, signUp } from '../services/auth';

function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-head">
          <p className="eyebrow">개인 작업 공간</p>
          <h1>로그인 후 내 과제만 관리할 수 있어요</h1>
          <p>이메일로 로그인하면 과제와 체크리스트가 사용자별로 따로 저장됩니다.</p>
        </div>
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="이메일"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호"
          />
          {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
          <button type="submit" className="primary-action auth-submit" disabled={isLoading}>
            {isLoading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>
        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
            setErrorMessage('');
          }}
        >
          {mode === 'login' ? '처음이라면 회원가입' : '이미 계정이 있다면 로그인'}
        </button>
      </section>
    </div>
  );
}

export default AuthPage;
