# IR 미팅 자동 정리

클로바노트 등에서 추출한 녹취록(txt) → OpenAI API로 Q&A 자동 추출 → 회의록 docx + 이메일 초안까지 한 번에 생성합니다.

두 가지 방식으로 쓸 수 있습니다: **CLI**(터미널) 또는 **웹앱**(브라우저).

## 1. 설치

```bash
pip install -r requirements.txt
```

## 2. API 키 설정

```bash
export OPENAI_API_KEY="sk-여기에-본인-키"
```

(OpenAI 플랫폼에서 발급: https://platform.openai.com/api-keys)

Windows PowerShell이면:
```powershell
$env:OPENAI_API_KEY="sk-여기에-본인-키"
```

---

## 방법 A. 웹앱으로 쓰기 (추천)

```bash
python webapp/app.py
```

브라우저에서 http://localhost:5000 접속 →

1. 클로바노트 txt 파일 드래그
2. 미팅 정보 / 이메일 정보 입력
3. "Q&A 정리 시작" 클릭
4. 도장 찍히면 완료 — docx / 이메일 초안 다운로드

## 방법 B. CLI로 쓰기

1. 클로바노트에서 녹취록을 텍스트로 내보내서 `transcript.txt`로 저장
2. `config_example.json`을 복사해서 `config.json`으로 만들고 이번 미팅 정보로 값 수정
3. 실행:

```bash
python process_meeting.py transcript.txt --config config.json --outdir ./output
```

`output/` 폴더에 `{file_base}.docx`, `{file_base}_이메일초안.txt`, `{file_base}_qa.json`이 생성됩니다.

---

## 결과물은 검수 후 발송 권장

모델이 가끔 후속 질문을 잘못 나누거나 요약이 어색할 수 있어서,
완전 무검수 자동발송보다는 **초안 생성 → 5분 검수 → 발송** 흐름을 권장합니다.

## 스타일/로직을 바꾸고 싶으면

- `prompts.py` — Q&A 추출 규칙(어미 통일, 질문 분리 기준 등)
- `core.py`의 `build_docx()` — 문서 레이아웃(폰트, 간격, 섹션 구성)
- `webapp/templates/index.html`, `webapp/static/style.css` — 웹앱 화면
- `webapp/app.py` — 웹 API 로직

## 폴더 구조

```
ir_automation/
├── core.py              # Q&A 추출 + 문서 생성 핵심 로직 (CLI/웹앱 공용)
├── prompts.py            # OpenAI 시스템 프롬프트
├── process_meeting.py    # CLI 진입점
├── requirements.txt
├── config_example.json
└── webapp/
    ├── app.py             # Flask 서버
    ├── templates/index.html
    └── static/{style.css, app.js}
```

## 참고

- 모델은 `core.py` 상단 `MODEL` 값(`gpt-5-mini`)으로 지정되어 있고, 필요시 교체 가능합니다.
- 녹취록이 매우 길 경우(2시간 이상 미팅 등) 한 번에 다 넣으면 출력이 잘릴 수 있으니,
  `max_tokens`를 늘리거나 필요시 앞부분/뒷부분을 나눠서 두 번 돌리는 것도 방법입니다.
- 이 도구는 로컬에서만 실행됩니다. Q&A를 추출하는 순간에만 OpenAI API로 텍스트가 전송되고,
  그 외에는 어떤 데이터도 외부로 나가지 않습니다.
