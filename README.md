# workflow3 — PI 업무분석·개선 스킬 모음

업무(Workflow, L3) 하나를 As-Is 분석부터 근본 원인 규명까지 단계적으로 다루는 GitHub Copilot 에이전트 스킬 모음입니다.
각 스킬은 고객(현업 담당자)과 대화하며 진행하고, 결과를 `output/` 폴더에 md로 저장합니다. 다음 스킬은 앞 스킬의 md를 입력으로 이어받습니다.

## 한눈에 보기

최상위의 [skill-guide.html](skill-guide.html)을 브라우저(Chrome·Edge)로 열고 `workflow3` 폴더(또는 `output` 폴더)를 한 번 선택하면, `output/`의 실제 산출물 md와 `.github/skills/`의 SKILL.md를 읽어 시각화합니다. 한 번 불러온 내용은 모든 페이지에서 함께 씁니다.

- 페이지: `skill-guide.html`(전체, 최상위) · `docs/step1.html`(업무 구조) · `docs/step2.html`(진단) · `docs/step3.html`(핵심 문제) · `docs/step4.html`(근본 원인) · `docs/step5.html`(실행 지식). 상단 단계 바로 이동합니다.
- 공통 파일: `docs/common.css`(디자인), `docs/common.js`(파일 읽기·md 파싱·상단 바·상세 패널). 페이지별 화면은 `docs/overview.js`, `docs/step1.js` ~ `docs/step5.js`에 있습니다.
- 항목(Action, Issue, 후보, 원인 가설)을 누르면 오른쪽 패널에 상세 값과 연결된 단계가 표시됩니다.
- 각 단계에서 `산출물 원문`, `스킬 절차` 탭으로 원본 md도 볼 수 있습니다.
- 외부 라이브러리 없이 HTML 파일 하나로 동작하며, 파일은 브라우저 밖으로 전송되지 않습니다. md를 고친 뒤에는 `폴더 다시 불러오기`를 누릅니다.

## 흐름

```
01 As-Is 업무분석 → 02 Workflow 진단 → 03 문제 발굴 인터뷰 → 04 근본 원인 심층 진단 → 05 수행 지식 인터뷰 → (Execution Design)
```

| 순서 | 스킬 | 하는 일 | 산출물 |
|---|---|---|---|
| 01 | [01-as-is-interview-consultant](.github/skills/01-as-is-interview-consultant/SKILL.md) | 업무를 Task·Action(L5)까지 분해하고 담당자 확인을 받아 As-Is 구조를 정리 | `output/01_l5_{Workflow명}.md` |
| 02 | [02-workflow-diagnosis-consultant](.github/skills/02-workflow-diagnosis-consultant/SKILL.md) | 모든 Action을 6개 영역별 0~100점으로 보수적으로 채점하고, 이를 문제 가설(Issue)로 묶어 개선 기회와 함께 점수화 | `output/02_diagnosis_{Workflow명}.md` |
| 03 | [03-problem-discovery-interview](.github/skills/03-problem-discovery-interview/SKILL.md) | 문제 후보를 고객 경험으로 검증·구체화·비교해 집중 분석할 문제 1개(Target Problem)를 합의 | `output/03_target_problem_{Workflow명}.md` |
| 04 | [04-root-cause-deep-dive](.github/skills/04-root-cause-deep-dive/SKILL.md) | 원인 가설을 세우고 실제 사례로 검증해 Root Cause Map, 개선 방향, 성공 기준을 합의 | `output/04_problem_brief_{Workflow명}.md` |
| 05 | [05-execution-knowledge-interview](.github/skills/05-execution-knowledge-interview/SKILL.md) | 대상 Action을 담당자가 실제로 어떤 정보·지식으로 추론·판단하는지 실제 사례로 따라가 8요소(Trigger·Input·Knowledge·Inference·Decision·Exception·Output·Evidence)로 구체화하고 사례 재현으로 검증 | `output/05_execution_knowledge_{Workflow명}.md` |

- 02는 선택 단계입니다. 03은 진단 보고서가 없어도 As-Is md나 인터뷰만으로 시작할 수 있습니다.
- 파일명 앞의 숫자는 그 파일을 만든 스킬 번호입니다. `{Workflow명}`의 공백은 `_`로 바꿉니다.
- 중단하면 `status: draft`로 저장되며, 그 md를 다시 주면 이어서 진행합니다.

## 사용 방법

1. VS Code에서 이 폴더를 열고 GitHub Copilot 채팅(에이전트 모드)을 엽니다.
2. 슬래시 명령으로 스킬을 호출합니다. 예: `/01-as-is-interview-consultant`
3. 앞 단계 산출물이 `output/`에 있으면 다음 스킬이 그 파일을 찾아 이어서 진행합니다. 파일을 채팅에 첨부해도 됩니다.

## 폴더 구조

```
skill-guide.html  산출물 뷰어 시작 페이지 (전체)
docs/             뷰어 단계 페이지(step1~4.html)와 공통 css·js
.github/skills/   스킬 정의 (SKILL.md)
.vscode/mcp.json  MCP 서버 설정 (Atlassian)
input/            고객 자료 등 입력 파일 (Git 제외)
output/           스킬 산출물 md (Git 제외)
```

`input/`과 `output/`에는 고객 업무 정보가 담기므로 `.gitignore`로 저장소에서 제외합니다.
