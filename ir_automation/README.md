# IR 미팅 자동 정리 스크립트

클로바노트 등에서 추출한 녹취록(txt) → Claude API로 Q&A 자동 추출 → 회의록 docx + 이메일 초안까지 한 번에 생성합니다.

## 1. 설치

```bash
pip install -r requirements.txt
```

## 2. API 키 설정

```bash
export ANTHROPIC_API_KEY="sk-ant-여기에-본인-키"
```

(Anthropic Console에서 발급: https://console.anthropic.com/settings/keys)

## 3. 미팅마다 할 일

1. 클로바노트에서 녹취록을 텍스트로 내보내서 `transcript.txt`로 저장
2. `config_example.json`을 복사해서 이번 미팅 정보로 값만 수정 (일시, 대상기관, 참석인원 등)
3. 실행:

```bash
python process_meeting.py transcript.txt --config config.json --outdir ./output
```

## 4. 결과물

`output/` 폴더에 아래 3개가 생성됩니다.

- `{file_base}.docx` — 회의록 (1~7번 항목, Q&A 요약 포함, 볼드/줄바꿈 자동 적용)
- `{file_base}_이메일초안.txt` — 상사에게 보낼 메일 본문 초안
- `{file_base}_qa.json` — 추출된 Q&A 원본 (검수/재사용용)

docx는 그대로 열어서 훑어보고 필요하면 손으로 다듬은 뒤 보내시면 됩니다.
(모델이 가끔 후속 질문을 잘못 나누거나 요약이 어색할 수 있어서, 완전 무검수 자동발송보다는
1차 초안 생성 → 5분 검수 후 발송을 권장합니다.)

## 5. 스타일을 바꾸고 싶으면

- `prompts.py` — Q&A 추출 규칙(어미 통일, 질문 분리 기준 등)을 여기서 수정
- `process_meeting.py`의 `build_docx()` — 문서 레이아웃(폰트, 간격, 섹션 구성)을 여기서 수정

## 6. 참고

- 현재 모델은 `claude-sonnet-4-5`로 지정되어 있습니다. `process_meeting.py` 상단의
  `MODEL` 값을 원하는 모델 스트링으로 바꿀 수 있습니다.
- 녹취록이 매우 길 경우(2시간 이상 미팅 등) 한 번에 다 넣으면 출력이 잘릴 수 있으니,
  `max_tokens`를 늘리거나 필요시 앞부분/뒷부분을 나눠서 두 번 돌리는 것도 방법입니다.
