import {
  AnalysisSource,
  Subject,
  TaskAnalysisResult,
  TaskBriefAnalysis,
  TaskChecklistStageDraft,
  TaskClarification,
  TaskFormValues,
} from '../types/task';

interface TaskAnalysisResponse {
  data: TaskAnalysisResult;
  source: AnalysisSource;
  errorMessage?: string;
}

interface RequestTaskChecklistOptions {
  clarifications?: TaskClarification[];
}

type OutputKind =
  | 'poster'
  | 'branding'
  | 'packaging'
  | 'editorial'
  | 'uxui'
  | 'space'
  | 'research'
  | 'presentation'
  | 'general';

const DEFAULT_MODEL = 'gpt-4.1-mini';

function compactText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function getAnsweredClarifications(clarifications: TaskClarification[] = []) {
  return clarifications
    .map((item) => ({
      question: compactText(item.question),
      answer: compactText(item.answer),
    }))
    .filter((item) => item.question && item.answer);
}

function formatClarificationsForPrompt(clarifications: TaskClarification[] = []) {
  const answered = getAnsweredClarifications(clarifications);

  if (answered.length === 0) {
    return '없음';
  }

  return answered.map((item) => `- ${item.question}: ${item.answer}`).join('\n');
}

function buildPrompt(subject: Subject, values: TaskFormValues, clarifications: TaskClarification[] = []) {
  return `
당신은 디자인 관련 학과 학생의 과제 브리프를 읽고,
필요한 작업을 추론해 체크리스트를 만드는 조교입니다.

당신의 역할은 사용자가 쓴 과제 설명을 표면적으로 요약하는 것이 아니라,
그 안에 담긴 요구사항과 결과물의 성격을 해석해서
실제로 필요한 작업 단계를 역으로 구성하는 것입니다.

입력 정보:
- 과목명: ${subject.name}
- 과목 설명: ${subject.description || '없음'}
- 과제명: ${values.title}
- 과제 상세 설명: ${values.description || '없음'}
- 팀 프로젝트 여부: ${values.isTeamProject ? '예' : '아니오'}
- 마감일: ${values.dueDate}

추가 확인 답변:
${formatClarificationsForPrompt(clarifications)}

당신은 다음을 판단해야 합니다:
- 이 과제의 성격
- 최종 결과물
- 리서치 필요 여부
- 발표 필요 여부
- 시안 비교 및 수정 필요 여부
- 협업 필요 요소

중요 규칙:
1. 사용자가 쓴 상세 설명과 추가 답변을 적극적으로 해석하세요.
2. 사용자가 직접 쓰지 않은 정보도 과제 맥락상 필요하면 추론해 반영하세요.
3. 모든 과제에 같은 단계를 반복하지 마세요.
4. 조사 비중이 크면 리서치와 자료 정리 단계를 늘리고, 제작 비중이 크면 스케치·시안·수정 단계를 구체화하세요.
5. 발표가 중요하면 발표 자료 준비와 발표 분업 태스크를 포함하세요.
6. 팀 프로젝트면 역할 분담, 파일 공유 방식, 발표 분업 같은 협업 태스크를 필요한 단계에 배치하세요.
7. 각 체크리스트는 반드시 실행 가능한 행동 1개만 담아야 합니다.
8. 추상적인 표현을 쓰지 마세요.
9. 정보가 부족하면 questions 배열에 확인 질문을 넣으세요.
10. questions는 예/아니오로 답할 수 있는 확인형 질문으로 작성하세요.
11. 이미 답변된 내용은 questions에서 반복하지 마세요.
12. 질문이 있더라도 현재 정보 기준의 작업 초안 stages는 반드시 함께 작성하세요.
13. 결과는 자연스러운 한국어 JSON만 반환하세요.
14. 불필요한 설명, 인사, 조언은 쓰지 마세요.

좋은 체크리스트 예:
- 관련 레퍼런스 10개 수집
- 교수 요구사항 기준으로 핵심 키워드 5개 정리
- 시안 3개 비교 제작
- 발표용 핵심 문장 3줄 정리

나쁜 체크리스트 예:
- 아이디어 발전
- 방향 설정
- 디자인 진행

반환 형식:
{
  "analysis": {
    "assignmentType": "과제 성격",
    "finalOutput": "최종 결과물",
    "needsResearch": true,
    "needsPresentation": false,
    "needsIteration": true,
    "reasoningSummary": "짧은 판단 근거"
  },
  "questions": [
    "추가 질문 1"
  ],
  "stages": [
    {
      "title": "단계 제목",
      "description": "단계 설명",
      "checklist": [
        "구체적 행동 1",
        "구체적 행동 2"
      ]
    }
  ]
}
`.trim();
}

function normalizeStageId(title: string, index: number) {
  const compact = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return compact || `stage-${index + 1}`;
}

function hasKeyword(source: string, keywords: string[]) {
  return keywords.some((keyword) => source.includes(keyword));
}

function joinSource(subject: Subject, values: TaskFormValues, clarifications: TaskClarification[] = []) {
  const answered = getAnsweredClarifications(clarifications)
    .map((item) => `${item.question} ${item.answer}`)
    .join(' ');

  return compactText(
    `${subject.name} ${subject.description} ${values.title} ${values.description} ${answered} ${
      values.isTeamProject ? '팀프로젝트' : ''
    }`.toLowerCase(),
  );
}

function inferOutputKind(source: string): OutputKind {
  if (hasKeyword(source, ['ux', 'ui', '앱', '웹', '서비스', '프로토타입', '와이어프레임', '사용자'])) {
    return 'uxui';
  }

  if (hasKeyword(source, ['브랜딩', '브랜드', '로고', '아이덴티티', 'bi', 'ci'])) {
    return 'branding';
  }

  if (hasKeyword(source, ['패키지', '포장', '라벨', '용기', '박스'])) {
    return 'packaging';
  }

  if (hasKeyword(source, ['편집', '매거진', '북', '책자', '인디자인', '리플렛'])) {
    return 'editorial';
  }

  if (hasKeyword(source, ['포스터', '그래픽 포스터', '캠페인 포스터'])) {
    return 'poster';
  }

  if (hasKeyword(source, ['전시', '공간', '부스', '동선', '설치', '환경 그래픽'])) {
    return 'space';
  }

  if (hasKeyword(source, ['리서치', '조사', '분석', '보고서', '논문', '리포트'])) {
    return 'research';
  }

  if (hasKeyword(source, ['발표', 'pt', 'ppt', '프레젠테이션', '피칭'])) {
    return 'presentation';
  }

  return 'general';
}

function inferFinalOutput(kind: OutputKind, source: string) {
  if (kind === 'uxui') {
    return hasKeyword(source, ['프로토타입'])
      ? '핵심 화면과 프로토타입'
      : '핵심 화면 설계안과 UI 시안';
  }

  if (kind === 'branding') {
    return hasKeyword(source, ['가이드'])
      ? '브랜딩 가이드와 적용 시안'
      : '브랜드 아이덴티티 시안';
  }

  if (kind === 'packaging') {
    return '패키지 그래픽 시안과 목업';
  }

  if (kind === 'editorial') {
    return '편집 레이아웃 결과물';
  }

  if (kind === 'poster') {
    return '포스터 최종안';
  }

  if (kind === 'space') {
    return '공간 구성안과 전시 보드';
  }

  if (kind === 'research') {
    return hasKeyword(source, ['발표']) ? '조사 정리본과 발표 자료' : '조사 보고서 또는 분석 정리본';
  }

  if (kind === 'presentation') {
    return '발표 자료와 발표용 시각 자료';
  }

  if (hasKeyword(source, ['인쇄', '출력'])) {
    return '최종 인쇄용 결과물';
  }

  if (hasKeyword(source, ['화면', '웹', '앱'])) {
    return '최종 화면 기반 결과물';
  }

  return '최종 제출용 시각 결과물';
}

function inferAssignmentType(kind: OutputKind, needsResearch: boolean, needsPresentation: boolean) {
  if (kind === 'uxui') {
    return 'UX/UI 설계 및 화면 제작 과제';
  }

  if (kind === 'branding') {
    return '브랜드 전략 및 아이덴티티 제작 과제';
  }

  if (kind === 'packaging') {
    return '패키지 구조와 그래픽 제작 과제';
  }

  if (kind === 'editorial') {
    return '편집 구조와 타이포 구성 과제';
  }

  if (kind === 'poster') {
    return '포스터 시각 구성 과제';
  }

  if (kind === 'space') {
    return '공간 조사와 전시 구성 과제';
  }

  if (kind === 'research') {
    return needsPresentation ? '조사 및 발표 중심 과제' : '조사 및 분석 중심 과제';
  }

  if (needsResearch && needsPresentation) {
    return '조사 기반 시각 정리 과제';
  }

  if (needsPresentation) {
    return '제작 결과 발표 포함 과제';
  }

  return '디자인 결과물 제작 과제';
}

function pushQuestion(questions: string[], answeredQuestions: Set<string>, question: string) {
  if (answeredQuestions.has(question)) {
    return;
  }

  if (!questions.includes(question)) {
    questions.push(question);
  }
}

function inferQuestions(
  source: string,
  subject: Subject,
  values: TaskFormValues,
  kind: OutputKind,
  needsPresentation: boolean,
  clarifications: TaskClarification[] = [],
) {
  const questions: string[] = [];
  const detailLength = compactText(values.description).length;
  const answeredQuestions = new Set(getAnsweredClarifications(clarifications).map((item) => item.question));
  const hasEvaluationHint = hasKeyword(source, ['평가', '기준', '중요', '핵심', '완성도', '요구사항']);
  const hasOutputHint = hasKeyword(source, ['결과물', '제출', '포스터', '앱', '웹', '브랜딩', '패키지', '책자', '발표']);
  const mediumKnown = hasKeyword(source, ['인쇄', '출력', '포스터', '책자', '앱', '웹', '화면', '공간', '전시', '목업']);

  if (detailLength < 45) {
    pushQuestion(questions, answeredQuestions, '교수님이 특히 중요하게 보는 기준이 있나요?');
  }

  if (!hasOutputHint || !mediumKnown) {
    pushQuestion(questions, answeredQuestions, '최종 결과물이 인쇄물 중심인가요?');
  }

  if (!needsPresentation && (detailLength < 70 || hasKeyword(subject.description.toLowerCase(), ['발표', 'pt']))) {
    pushQuestion(questions, answeredQuestions, '이 과제는 발표까지 포함되나요?');
  }

  if (kind !== 'research' && !hasKeyword(source, ['시안', '비교', '안'])) {
    pushQuestion(questions, answeredQuestions, '시안은 여러 안을 비교해야 하나요?');
  }

  if (values.isTeamProject && !hasKeyword(source, ['역할', '분담', '공유', '협업'])) {
    pushQuestion(questions, answeredQuestions, '팀원별 역할 분담과 파일 공유 규칙을 따로 정해야 하나요?');
  }

  if (!hasEvaluationHint && detailLength >= 45) {
    pushQuestion(questions, answeredQuestions, '교수님이 특히 중요하게 보는 기준이 더 있나요?');
  }

  return questions.slice(0, 3);
}

function createAnalysis(subject: Subject, values: TaskFormValues, clarifications: TaskClarification[] = []) {
  const source = joinSource(subject, values, clarifications);
  const kind = inferOutputKind(source);
  const needsResearch =
    kind === 'research' ||
    hasKeyword(source, ['리서치', '조사', '분석', '자료', '근거', '레퍼런스', '시장', '사례', '타깃']);
  const needsPresentation =
    kind === 'presentation' || hasKeyword(source, ['발표', 'pt', 'ppt', '프레젠테이션', '피칭']);
  const needsIteration =
    kind === 'uxui' ||
    hasKeyword(source, ['시안', '수정', '피드백', '테스트', '반복', '프로토타입', '비교']);
  const finalOutput = inferFinalOutput(kind, source);
  const assignmentType = inferAssignmentType(kind, needsResearch, needsPresentation);

  const reasoningParts = [
    `${values.title} 설명을 ${assignmentType}로 해석했습니다`,
    needsResearch ? '자료 조사와 근거 정리가 필요해 보입니다' : '',
    needsPresentation ? '발표 준비 태스크가 함께 필요해 보입니다' : '',
    needsIteration ? '시안 비교와 수정 과정을 포함해야 합니다' : '',
  ].filter(Boolean);

  return {
    analysis: {
      assignmentType,
      finalOutput,
      needsResearch,
      needsPresentation,
      needsIteration,
      reasoningSummary: reasoningParts.slice(0, 2).join('. ') + '.',
    } satisfies TaskBriefAnalysis,
    kind,
    source,
  };
}

function createStage(title: string, description: string, checklist: string[]): TaskChecklistStageDraft {
  return {
    id: '',
    title,
    description,
    checklist,
  };
}

function createRequirementStage(subject: Subject, values: TaskFormValues, finalOutput: string) {
  const checklist = [
    `${values.description ? '과제 상세 설명에서' : '과제명 기준으로'} 요구사항 3개 정리`,
    `${subject.name} 수업 기준과 제출 조건을 한 장 메모로 정리`,
    `${finalOutput} 기준으로 필요한 산출물 목록 작성`,
  ];

  if (values.isTeamProject) {
    checklist.push('팀원 역할 분담 초안 정리');
  }

  return createStage('브리프 정리', '과제 요구사항과 제출 범위를 먼저 분명하게 정리합니다.', checklist);
}

function createResearchStage(kind: OutputKind, values: TaskFormValues, subject: Subject) {
  const baseChecklist =
    kind === 'uxui'
      ? ['유사 서비스 화면 5개 캡처', '참고 플로우 3개 비교 정리', '사용자 불편 포인트 3개 메모']
      : kind === 'branding'
        ? ['동종 브랜드 3곳 조사', '레퍼런스 이미지 10개 수집', '브랜드 톤 차이 3가지 정리']
        : kind === 'packaging'
          ? ['유사 제품 패키지 5개 조사', '표기해야 할 정보 항목 정리', '패키지 재질·형태 참고 사례 3개 수집']
          : kind === 'editorial'
            ? ['편집 레퍼런스 5개 수집', '그리드와 타이포 참고 사례 3개 정리', '들어갈 텍스트 분량 확인']
            : kind === 'space'
              ? ['유사 전시/공간 사례 5개 조사', '동선 참고 이미지 3개 수집', '공간 제약 조건 메모']
              : kind === 'research'
                ? ['참고 자료 출처 5개 확보', '조사 대상 기준 3개 정리', '핵심 비교 항목 표 작성']
                : ['관련 레퍼런스 이미지 10개 수집', '유사 사례 3개 비교 정리', `${subject.name} 수업 기준과 연결되는 포인트 3개 메모`];

  return createStage('자료 조사', `${values.title}에 필요한 참고 자료와 근거를 먼저 모읍니다.`, baseChecklist);
}

function createPlanningStage(kind: OutputKind) {
  const checklist =
    kind === 'uxui'
      ? ['핵심 사용자 흐름 1개 작성', '필요 화면 목록 정리', '와이어프레임 범위 확정']
      : kind === 'branding'
        ? ['브랜드 키워드 5개 정리', '브랜드 메시지 한 줄 정의', '적용 매체 2개 선정']
        : kind === 'packaging'
          ? ['패키지 면 구성 초안 작성', '표기 정보 우선순위 정리', '구조 또는 라벨 방향 2안 비교']
          : kind === 'editorial'
            ? ['콘텐츠 순서 정리', '그리드 기준안 2개 비교', '페이지별 정보량 배치표 작성']
            : kind === 'space'
              ? ['존 구성안 2개 스케치', '동선 시퀀스 정리', '필요 오브젝트 목록 작성']
              : kind === 'research'
                ? ['리서치 목차 초안 작성', '핵심 인사이트 후보 3개 정리', '자료 정리 방식 결정']
                : ['핵심 키워드 5개 정리', '작업 방향 2안 비교', '우선 제작할 요소 순서 정리'];

  return createStage('작업 방향 설계', '본작업에 들어가기 전 구조와 우선순위를 정리합니다.', checklist);
}

function createProductionStage(kind: OutputKind, values: TaskFormValues) {
  const checklist =
    kind === 'uxui'
      ? ['핵심 화면 3개 이상 제작', '컴포넌트 스타일 기준 적용', '주요 인터랙션 흐름 연결']
      : kind === 'branding'
        ? ['로고 또는 핵심 시각 요소 3안 제작', '메인 컬러와 서체 조합 확정', '적용 시안 2개 제작']
        : kind === 'packaging'
          ? ['패키지 그래픽 1차 시안 제작', '전면·측면 정보 배치 반영', '목업용 이미지 1차 제작']
          : kind === 'editorial'
            ? ['대표 지면 3페이지 이상 제작', '타이포 스타일 적용', '정렬과 여백 기준 반영']
            : kind === 'space'
              ? ['공간 배치안 1차 제작', '전시 요소 배치 시각화', '설명 보드 구성 초안 제작']
              : kind === 'research'
                ? ['조사 결과 표와 요약 정리', '핵심 인사이트 3개 문장화', '보고서 또는 발표 슬라이드 초안 제작']
                : ['시안 1차 제작', '핵심 요소 배치 확정', '작업 파일 버전 저장'];

  return createStage('본작업 제작', `${values.title} 결과물을 제출 가능한 형태로 구체화합니다.`, checklist);
}

function createIterationStage(kind: OutputKind) {
  const checklist =
    kind === 'uxui'
      ? ['화면 흐름 검토 후 수정 항목 5개 정리', '사용성 피드백 반영', '수정본 비교 캡처 저장']
      : kind === 'branding'
        ? ['시안 3개 비교 정리', '브랜드 일관성 어색한 부분 수정', '수정 반영 버전 저장']
        : kind === 'packaging'
          ? ['가독성 낮은 정보 수정', '면 전환과 정렬 점검', '수정본 목업 다시 저장']
          : kind === 'editorial'
            ? ['페이지 간 톤 차이 점검', '그리드와 정렬 다시 확인', '수정본 PDF 저장']
            : kind === 'space'
              ? ['동선 충돌 지점 수정', '설치 요소 크기 다시 점검', '수정안 비교본 저장']
              : kind === 'research'
                ? ['근거가 약한 문장 보완', '자료 출처 표기 다시 확인', '요약 구조 수정']
                : ['수정할 항목 5개 정리', '시안 비교 후 한 안으로 정리', '수정 반영본 저장'];

  return createStage('검토 및 수정', '중간 점검 결과를 반영해 완성도를 높입니다.', checklist);
}

function createPresentationStage(values: TaskFormValues) {
  const checklist = ['발표용 핵심 문장 3줄 정리', '슬라이드 순서 작성', '발표용 이미지와 결과 화면 정리'];

  if (values.isTeamProject) {
    checklist.push('발표 자료 분업 여부 확인');
  }

  return createStage('발표 준비', '발표가 포함된 과제라면 설명 흐름과 시각 자료를 정리합니다.', checklist);
}

function createFinalStage(kind: OutputKind, values: TaskFormValues) {
  const checklist = [
    '최종 파일명 규칙 맞춰 저장',
    kind === 'packaging' || kind === 'poster' || kind === 'editorial'
      ? '인쇄 또는 출력 설정 확인'
      : '제출 형식에 맞게 파일 내보내기',
    '제출 전 빠진 산출물 없는지 확인',
  ];

  if (values.isTeamProject) {
    checklist.push('공유 폴더 최신 버전 확인');
  }

  return createStage('제출 직전 점검', '마감 전에 제출 형식과 빠진 항목을 최종 확인합니다.', checklist);
}

function createFallbackResult(
  subject: Subject,
  values: TaskFormValues,
  clarifications: TaskClarification[] = [],
): TaskAnalysisResult {
  const { analysis, kind, source } = createAnalysis(subject, values, clarifications);
  const questions = inferQuestions(source, subject, values, kind, analysis.needsPresentation, clarifications);
  const stages: TaskChecklistStageDraft[] = [];

  stages.push(createRequirementStage(subject, values, analysis.finalOutput));

  if (
    analysis.needsResearch ||
    ['uxui', 'branding', 'packaging', 'editorial', 'space', 'research', 'poster'].includes(kind)
  ) {
    stages.push(createResearchStage(kind, values, subject));
  }

  if (kind !== 'presentation') {
    stages.push(createPlanningStage(kind));
  }

  stages.push(createProductionStage(kind, values));

  if (analysis.needsIteration || kind !== 'research') {
    stages.push(createIterationStage(kind));
  }

  if (analysis.needsPresentation) {
    stages.push(createPresentationStage(values));
  }

  stages.push(createFinalStage(kind, values));

  if (values.isTeamProject) {
    const firstStage = stages[0];
    const presentationStage = stages.find((stage) => stage.title === '발표 준비');

    if (firstStage && !firstStage.checklist.includes('작업 파일 공유 방식 정리')) {
      firstStage.checklist.push('작업 파일 공유 방식 정리');
    }

    if (presentationStage && !presentationStage.checklist.includes('팀원 발표 순서 확인')) {
      presentationStage.checklist.push('팀원 발표 순서 확인');
    }
  }

  return {
    analysis,
    questions,
    stages: withIds(stages),
  };
}

function isTaskBriefAnalysis(value: unknown): value is TaskBriefAnalysis {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const analysis = value as Record<string, unknown>;
  return (
    typeof analysis.assignmentType === 'string' &&
    typeof analysis.finalOutput === 'string' &&
    typeof analysis.needsResearch === 'boolean' &&
    typeof analysis.needsPresentation === 'boolean' &&
    typeof analysis.needsIteration === 'boolean' &&
    typeof analysis.reasoningSummary === 'string'
  );
}

function isStageDraft(value: unknown): value is TaskChecklistStageDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const stage = value as Record<string, unknown>;
  return (
    typeof stage.title === 'string' &&
    typeof stage.description === 'string' &&
    Array.isArray(stage.checklist) &&
    stage.checklist.every((item) => typeof item === 'string')
  );
}

function isAnalysisResult(value: unknown): value is TaskAnalysisResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as Record<string, unknown>;
  return (
    isTaskBriefAnalysis(result.analysis) &&
    Array.isArray(result.questions) &&
    result.questions.every((question) => typeof question === 'string') &&
    Array.isArray(result.stages) &&
    result.stages.every((stage) => isStageDraft(stage))
  );
}

function withIds(stages: TaskChecklistStageDraft[]) {
  return stages.map((stage, index) => ({
    ...stage,
    id: stage.id || normalizeStageId(stage.title, index),
    checklist: stage.checklist.map((item) => compactText(item)).filter(Boolean),
  }));
}

function normalizeResult(result: TaskAnalysisResult): TaskAnalysisResult {
  return {
    analysis: {
      ...result.analysis,
      assignmentType: compactText(result.analysis.assignmentType),
      finalOutput: compactText(result.analysis.finalOutput),
      reasoningSummary: compactText(result.analysis.reasoningSummary),
    },
    questions: result.questions.map((question) => compactText(question)).filter(Boolean),
    stages: withIds(result.stages),
  };
}

export async function requestTaskChecklist(
  subject: Subject,
  values: TaskFormValues,
  options: RequestTaskChecklistOptions = {},
): Promise<TaskAnalysisResponse> {
  const clarifications = options.clarifications ?? [];
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const model = import.meta.env.VITE_OPENAI_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    return {
      data: createFallbackResult(subject, values, clarifications),
      source: 'mock',
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: buildPrompt(subject, values, clarifications),
        text: {
          format: {
            type: 'json_schema',
            name: 'task_checklist',
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                analysis: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    assignmentType: { type: 'string' },
                    finalOutput: { type: 'string' },
                    needsResearch: { type: 'boolean' },
                    needsPresentation: { type: 'boolean' },
                    needsIteration: { type: 'boolean' },
                    reasoningSummary: { type: 'string' },
                  },
                  required: [
                    'assignmentType',
                    'finalOutput',
                    'needsResearch',
                    'needsPresentation',
                    'needsIteration',
                    'reasoningSummary',
                  ],
                },
                questions: {
                  type: 'array',
                  items: { type: 'string' },
                },
                stages: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      checklist: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['title', 'description', 'checklist'],
                  },
                },
              },
              required: ['analysis', 'questions', 'stages'],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error('API 요청 실패');
    }

    const payload = (await response.json()) as { output_text?: string };
    const parsed = payload.output_text ? (JSON.parse(payload.output_text) as unknown) : null;

    if (!isAnalysisResult(parsed)) {
      throw new Error('응답 형식 오류');
    }

    return {
      data: normalizeResult(parsed),
      source: 'api',
    };
  } catch {
    return {
      data: createFallbackResult(subject, values, clarifications),
      source: 'fallback',
      errorMessage: '체크리스트 분석에 실패해 기본 항목을 표시합니다. 잠시 후 다시 시도해주세요.',
    };
  }
}
