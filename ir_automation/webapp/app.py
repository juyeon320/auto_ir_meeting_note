# -*- coding: utf-8 -*-
"""
IR 미팅 자동화 웹앱 (Flask).

실행:
    export ANTHROPIC_API_KEY="sk-ant-..."
    pip install -r requirements.txt
    python webapp/app.py

브라우저에서 http://localhost:5000 접속.
"""

import json
import sys
import uuid
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_from_directory

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # core.py, prompts.py 참조용

from anthropic import Anthropic
from core import run_pipeline, build_docx, build_email_draft, fill_email_main_content

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
JOBS_DIR = BASE_DIR / "jobs"
JOBS_DIR.mkdir(exist_ok=True)

REQUIRED_FIELDS = [
    "datetime", "target_org", "attendees", "sender_name",
    "file_base", "email_date_short", "email_date_long", "attachment_base",
]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/process", methods=["POST"])
def process():
    transcript_file = request.files.get("transcript")
    if not transcript_file or not transcript_file.filename:
        return jsonify({"error": "녹취록 파일을 업로드해주세요."}), 400

    meta = {}
    for field in REQUIRED_FIELDS:
        value = request.form.get(field, "").strip()
        if not value:
            return jsonify({"error": f"'{field}' 값이 비어있습니다."}), 400
        meta[field] = value

    meta["ir_type"] = request.form.get("ir_type", "기업탐방").strip() or "기업탐방"
    meta["notes"] = request.form.get("notes", "없음").strip() or "없음"
    email_main_content = request.form.get("email_main_content", "").strip()
    if email_main_content:
        meta["email_main_content"] = email_main_content

    try:
        transcript_text = transcript_file.read().decode("utf-8")
    except UnicodeDecodeError:
        return jsonify({"error": "파일 인코딩을 읽을 수 없습니다. UTF-8 텍스트 파일인지 확인해주세요."}), 400

    job_id = uuid.uuid4().hex[:10]
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    try:
        client = Anthropic()  # ANTHROPIC_API_KEY 환경변수 필요
        qa_list, topic_bullets = run_pipeline(client, transcript_text)
    except Exception as e:
        return jsonify({"error": f"Q&A 추출 중 오류가 발생했습니다: {e}"}), 500

    meta = fill_email_main_content(meta, topic_bullets)

    docx_name = f"{meta['file_base']}.docx"
    email_name = f"{meta['file_base']}_이메일초안.txt"

    try:
        build_docx(meta, qa_list, topic_bullets, job_dir / docx_name)
        build_email_draft(meta, job_dir / email_name)
    except Exception as e:
        return jsonify({"error": f"문서 생성 중 오류가 발생했습니다: {e}"}), 500

    (job_dir / f"{meta['file_base']}_qa.json").write_text(
        json.dumps(qa_list, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    return jsonify({
        "job_id": job_id,
        "qa_count": len(qa_list),
        "topics": topic_bullets,
        "files": {
            "docx": docx_name,
            "email": email_name,
        },
    })


@app.route("/api/download/<job_id>/<path:filename>")
def download(job_id, filename):
    job_dir = JOBS_DIR / job_id
    if not job_dir.exists():
        return "해당 작업을 찾을 수 없습니다.", 404
    return send_from_directory(job_dir, filename, as_attachment=True)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
