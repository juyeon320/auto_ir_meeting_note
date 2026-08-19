#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
IR 미팅 녹취록(클로바노트 등에서 추출한 txt) -> 회의록 docx + 이메일 초안 자동 생성 (CLI)

사용법:
    export ANTHROPIC_API_KEY="sk-ant-..."
    python process_meeting.py transcript.txt --config config.json --outdir ./output

필요 패키지: pip install -r requirements.txt
"""

import argparse
import json
from pathlib import Path

from openai import OpenAI

from core import run_pipeline, build_docx, build_email_draft, fill_email_main_content


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("transcript", help="클로바노트 등에서 추출한 txt 파일 경로")
    parser.add_argument("--config", required=True, help="회의 메타정보 JSON 파일 경로")
    parser.add_argument("--outdir", default="./output", help="출력 디렉토리")
    args = parser.parse_args()

    transcript = Path(args.transcript).read_text(encoding="utf-8")
    meta = json.loads(Path(args.config).read_text(encoding="utf-8"))

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    client = OpenAI()  # OPENAI_API_KEY 환경변수 사용

    print("[1/3] Q&A 추출 중...")
    qa_list, topic_bullets = run_pipeline(client, transcript)
    print(f"  -> {len(qa_list)}개 Q&A 추출 완료")

    print("[2/3] 문서 생성 중...")
    meta = fill_email_main_content(meta, topic_bullets)
    docx_path = outdir / f"{meta['file_base']}.docx"
    build_docx(meta, qa_list, topic_bullets, docx_path)

    email_path = outdir / f"{meta['file_base']}_이메일초안.txt"
    build_email_draft(meta, email_path)

    print("[3/3] 완료!")
    (outdir / f"{meta['file_base']}_qa.json").write_text(
        json.dumps(qa_list, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"결과물: {outdir}")


if __name__ == "__main__":
    main()
