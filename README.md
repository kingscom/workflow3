# workflow3 — PI 업무분석·개선 스킬 모음

업무(Workflow, L3) 하나를 As-Is 분석부터 근본 원인 규명까지 단계적으로 다루는 GitHub Copilot 에이전트 스킬 모음입니다.
각 스킬은 고객(현업 담당자)과 대화하며 진행하고, 결과를 `output/` 폴더에 md로 저장합니다. 다음 스킬은 앞 스킬의 md를 입력으로 이어받습니다.

## 흐름

```
01 As-Is 업무분석 → 02 Workflow 진단 → 03 문제 발굴 인터뷰 → 04 근본 원인 심층 진단 → (Execution Design)
```

| 순서 | 스킬 | 하는 일 | 산출물 |
|---|---|---|---|
| 01 | [01-as-is-interview-consultant](.github/skills/01-as-is-interview-consultant/SKILL.md) | 업무를 Task·Action(L5)까지 분해하고 담당자 확인을 받아 As-Is 구조를 정리 | `output/01_l5_{Workflow명}.md` |
| 02 | [02-workflow-diagnosis-consultant](.github/skills/02-workflow-diagnosis-consultant/SKILL.md) | As-Is 구조를 7개 영역으로 진단해 문제 가설(Issue)과 개선 기회를 점수화 | `output/02_diagnosis_{Workflow명}.md` |
| 03 | [03-problem-discovery-interview](.github/skills/03-problem-discovery-interview/SKILL.md) | 문제 후보를 고객 경험으로 검증·구체화·비교해 집중 분석할 문제 1개(Target Problem)를 합의 | `output/03_target_problem_{Workflow명}.md` |
| 04 | [04-root-cause-deep-dive](.github/skills/04-root-cause-deep-dive/SKILL.md) | 원인 가설을 세우고 실제 사례로 검증해 Root Cause Map, 개선 방향, 성공 기준을 합의 | `output/04_problem_brief_{Workflow명}.md` |

- 02는 선택 단계입니다. 03은 진단 보고서가 없어도 As-Is md나 인터뷰만으로 시작할 수 있습니다.
- 파일명 앞의 숫자는 그 파일을 만든 스킬 번호입니다. `{Workflow명}`의 공백은 `_`로 바꿉니다.
- 중단하면 `status: draft`로 저장되며, 그 md를 다시 주면 이어서 진행합니다.

## 사용 방법

1. VS Code에서 이 폴더를 열고 GitHub Copilot 채팅(에이전트 모드)을 엽니다.
2. 슬래시 명령으로 스킬을 호출합니다. 예: `/01-as-is-interview-consultant`
3. 앞 단계 산출물이 `output/`에 있으면 다음 스킬이 그 파일을 찾아 이어서 진행합니다. 파일을 채팅에 첨부해도 됩니다.

## 폴더 구조

```
.github/skills/   스킬 정의 (SKILL.md)
.vscode/mcp.json  MCP 서버 설정 (Atlassian)
input/            고객 자료 등 입력 파일 (Git 제외)
output/           스킬 산출물 md (Git 제외)
```

`input/`과 `output/`에는 고객 업무 정보가 담기므로 `.gitignore`로 저장소에서 제외합니다.
