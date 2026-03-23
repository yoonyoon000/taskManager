import {
  AnalysisSource,
  Subject,
  TaskAnalysisResult,
  TaskChecklistStageDraft,
  TaskFormValues,
} from '../types/task';

interface TaskAnalysisResponse {
  data: TaskAnalysisResult;
  source: AnalysisSource;
  errorMessage?: string;
}

const DEFAULT_MODEL = 'gpt-4.1-mini';

function buildPrompt(subject: Subject, values: TaskFormValues) {
  return `
당신은 디자인 관련 학과 학생의 과제를 세부 할 일로 나누는 조교입니다.
추천 방향, 응원 문구, 추상적 조언 없이 실제 행동 가능한 체크리스트만 만드세요.

반환 조건:
- 모든 텍스트는 한국어
- 문장은 짧고 자연스럽게
- 단계는 4~6개
- 각 단계는 title, description, checklist 배열을 가져야 함
- checklist 항목은 학생이 바로 실행할 수 있는 실제 할 일
- 팀플이면 역할 분담, 파일 공유, 발표 분업 같은 항목을 일부 포함
- JSON 외 텍스트 금지

반환 형식:
{
  "stages": [
    {
      "title": "string",
      "description": "string",
      "checklist": ["string"]
    }
  ]
}

과목명: ${subject.name}
과목 설명: ${subject.description}
수업 특징: ${subject.focusNote || '없음'}
수업 성향: ${subject.classStyle}
과제명: ${values.title}
과제 설명: ${values.description || '없음'}
팀플 여부: ${values.isTeamProject ? '예' : '아니오'}
마감일: ${values.dueDate}
`.trim();
}

function normalizeStageId(title: string, index: number) {
  const compact = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return compact || `stage-${index + 1}`;
}

function createFallbackStages(subject: Subject, values: TaskFormValues): TaskChecklistStageDraft[] {
  const keywordSource = `${subject.description} ${subject.focusNote}`.toLowerCase();
  const needsGrid = keywordSource.includes('그리드');
  const needsTypography = keywordSource.includes('타이포');
  const needsResearch = subject.classStyle === '리서치 중심' || keywordSource.includes('리서치');
  const needsPresentation = subject.classStyle === '발표 중심' || keywordSource.includes('발표');
  const needsOutput = subject.classStyle === '결과물 중심';

  const stages: TaskChecklistStageDraft[] = [
    {
      id: 'requirements',
      title: '과제 요구 정리',
      description: `${values.title}에 필요한 조건을 먼저 정리합니다.`,
      checklist: [
        `${values.title} 제출 형식 다시 확인`,
        `${subject.name} 수업 기준에서 중요한 요소 메모`,
        '마감 전까지 필요한 산출물 목록 적기',
      ],
    },
    {
      id: 'research',
      title: '자료 조사',
      description: `${values.title} 진행에 필요한 참고 자료를 모읍니다.`,
      checklist: [
        `${values.title} 관련 사례 3개 이상 정리`,
        needsResearch ? '리서치 근거가 될 자료 출처 정리' : '참고 이미지와 레이아웃 자료 정리',
        '쓸 수 있는 이미지/텍스트 자료 구분하기',
      ],
    },
    {
      id: 'structure',
      title: '구성안 정리',
      description: `수업 기준에 맞게 ${values.title} 구성안을 잡습니다.`,
      checklist: [
        needsGrid ? '그리드 기준안 먼저 잡기' : `${values.title} 정보 우선순위 정리`,
        needsTypography ? '타이포 스타일 후보 비교' : '메인 제목과 보조 정보 배치 정리',
        '중간 확인용 초안 한 벌 만들기',
      ],
    },
    {
      id: 'production',
      title: '제작 진행',
      description: `구성안을 바탕으로 ${values.title} 결과물을 만듭니다.`,
      checklist: [
        '1차 시안 제작',
        needsOutput ? '최종 제출 크기와 포맷 기준 반영' : '피드백 반영 전 수정 포인트 표시',
        '교수님 또는 팀원 확인용 버전 정리',
      ],
    },
    {
      id: 'finalize',
      title: needsPresentation ? '발표 및 제출 준비' : '최종 점검',
      description: `제출 직전에 빠지기 쉬운 항목을 정리합니다.`,
      checklist: [
        needsPresentation ? '발표 슬라이드에 핵심 화면 넣기' : '최종 파일명과 버전 정리',
        '오탈자와 정렬 다시 확인',
        '제출 직전 내보내기 파일 저장',
      ],
    },
  ];

  if (values.isTeamProject) {
    stages[0].checklist.push('팀원 역할 분담 표 정리');
    stages[1].checklist.push('공유 폴더와 파일명 규칙 정리');
    stages[4].checklist.push('발표 분업 여부와 발표 순서 확인');
  }

  return stages;
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
  return Array.isArray(result.stages) && result.stages.every((stage) => isStageDraft(stage));
}

function withIds(stages: TaskChecklistStageDraft[]) {
  return stages.map((stage, index) => ({
    ...stage,
    id: stage.id || normalizeStageId(stage.title, index),
  }));
}

export async function requestTaskChecklist(
  subject: Subject,
  values: TaskFormValues,
): Promise<TaskAnalysisResponse> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const model = import.meta.env.VITE_OPENAI_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    return {
      data: {
        stages: withIds(createFallbackStages(subject, values)),
      },
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
        input: buildPrompt(subject, values),
        text: {
          format: {
            type: 'json_schema',
            name: 'task_checklist',
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
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
              required: ['stages'],
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
      data: {
        stages: withIds(parsed.stages),
      },
      source: 'api',
    };
  } catch {
    return {
      data: {
        stages: withIds(createFallbackStages(subject, values)),
      },
      source: 'fallback',
      errorMessage: '체크리스트 분석에 실패해 기본 항목을 표시합니다. 잠시 후 다시 시도해주세요.',
    };
  }
}
