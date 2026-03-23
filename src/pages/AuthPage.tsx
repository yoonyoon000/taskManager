import { useState } from 'react';
import { login } from '../services/auth';

function AuthPage() {
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!userId.trim()) {
      setErrorMessage('아이디를 입력해주세요.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await login(userId);
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
          <h1>아이디만 입력하면 바로 시작할 수 있어요</h1>
          <p>같은 브라우저에서는 로그인 상태가 유지되어 내 과제를 이어서 관리할 수 있습니다.</p>
        </div>
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <input
            type="text"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="아이디"
            autoComplete="username"
          />
          {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
          <button type="submit" className="primary-action auth-submit" disabled={isLoading}>
            {isLoading ? '시작하는 중...' : '바로 시작하기'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default AuthPage;
