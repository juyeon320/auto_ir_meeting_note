const dropzone = document.getElementById("dropzone");
const dropzoneText = document.getElementById("dropzoneText");
const transcriptInput = document.getElementById("transcriptInput");

const submitBtn = document.getElementById("submitBtn");
const submitBtnText = document.getElementById("submitBtnText");
const errorMsg = document.getElementById("errorMsg");

const resultEmpty = document.getElementById("resultEmpty");
const resultLoading = document.getElementById("resultLoading");
const resultDone = document.getElementById("resultDone");
const loadingText = document.getElementById("loadingText");
const stamp = document.getElementById("stamp");
const resultMetaText = document.getElementById("resultMetaText");
const topicList = document.getElementById("topicList");
const downloadDocx = document.getElementById("downloadDocx");
const downloadEmail = document.getElementById("downloadEmail");

const f_ir_type = document.getElementById("f_ir_type");
const f_target_org = document.getElementById("f_target_org");
const f_start_time = document.getElementById("f_start_time");
const f_end_time = document.getElementById("f_end_time");

let selectedFile = null;

// ---- 드롭존 ----
dropzone.addEventListener("click", () => transcriptInput.click());

transcriptInput.addEventListener("change", () => {
  if (transcriptInput.files.length) setFile(transcriptInput.files[0]);
});

["dragenter", "dragover"].forEach(evt =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("is-dragover");
  })
);
["dragleave", "drop"].forEach(evt =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("is-dragover");
  })
);
dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

function setFile(file) {
  selectedFile = file;
  dropzone.classList.add("has-file");
  dropzoneText.textContent = file.name;

  // 텍스트 읽어서 자동 필드 추출 시도
  const reader = new FileReader();
  reader.onload = () => {
    try {
      autoFillFromTranscript(reader.result);
    } catch (e) {
      // 파싱 실패해도 조용히 무시 - 사용자가 수동으로 채우면 됨
      console.warn("자동 인식 실패:", e);
    }
  };
  reader.readAsText(file, "UTF-8");
}

// ---- 녹취록 헤더에서 자동 필드 추출 ----
function autoFillFromTranscript(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return;

  // 1번째 줄: "260819 미래인베스트먼트" -> 대상기관명
  const line1Match = lines[0].match(/^\d{6}\s+(.+)$/);
  const orgName = line1Match ? line1Match[1].trim() : null;

  // 2번째 줄: "2026.08.19 수 오후 1:59 ・ 64분 45초" -> 시작/종료 시간
  const line2Match = lines[1].match(
    /(오전|오후)\s*(\d{1,2}):(\d{2})\s*[·・]?\s*(\d+)\s*분/
  );

  let startHHMM = null;
  let endHHMM = null;

  if (line2Match) {
    const [, ampm, hStr, mStr, durMinStr] = line2Match;
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const durMin = parseInt(durMinStr, 10);

    if (ampm === "오후" && h !== 12) h += 12;
    if (ampm === "오전" && h === 12) h = 0;

    const startTotalMin = h * 60 + m;
    const endTotalMin = startTotalMin + durMin;

    startHHMM = minutesToHHMM(startTotalMin);
    endHHMM = minutesToHHMM(endTotalMin % (24 * 60));
  }

  // 본문 키워드로 IR 형태 추정 (대면 vs 비대면)
  const bodyText = lines.slice(2).join(" ");
  const remoteHints = ["화상", "전화로", "온라인으로", "컨퍼런스콜", "줌으로"];
  const onsiteHints = ["오시는 분들", "와주셔서 감사합니다", "찾아다닌다고", "방문"];

  let guessedType = null;
  if (onsiteHints.some(k => bodyText.includes(k))) guessedType = "기업탐방";
  else if (remoteHints.some(k => bodyText.includes(k))) guessedType = "컨퍼런스콜";

  // ---- 필드에 반영 (기존에 사용자가 직접 입력한 값은 덮어쓰지 않도록 살짝 보수적으로) ----
  if (orgName && !f_target_org.value.trim()) {
    f_target_org.value = orgName;
    highlightAutoField(f_target_org);
  }
  if (startHHMM) {
    f_start_time.value = startHHMM;
    highlightAutoField(f_start_time);
  }
  if (endHHMM) {
    f_end_time.value = endHHMM;
    highlightAutoField(f_end_time);
  }
  if (guessedType) {
    f_ir_type.value = guessedType;
    highlightAutoField(f_ir_type);
  }
}

function minutesToHHMM(totalMin) {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function highlightAutoField(el) {
  el.classList.remove("auto-filled");
  // 리플로우 강제 트리거해서 애니메이션 재실행 가능하게
  void el.offsetWidth;
  el.classList.add("auto-filled");
}

// ---- 진행 메시지 순환 ----
const LOADING_MESSAGES = [
  "녹취록을 읽는 중...",
  "질문과 답변을 골라내는 중...",
  "어미를 다듬는 중...",
  "주요 논의 내용을 요약하는 중...",
  "회의록 문서를 만드는 중...",
];
let loadingInterval = null;

function startLoadingMessages() {
  let i = 0;
  loadingText.textContent = LOADING_MESSAGES[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    loadingText.textContent = LOADING_MESSAGES[i];
  }, 2200);
}
function stopLoadingMessages() {
  clearInterval(loadingInterval);
}

// ---- 자동 필드 계산 ----
const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function timeToKorean(hhmm) {
  // "14:00" -> {ampm: "오후", hh: "14", mm: "00"}
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h < 12 ? "오전" : "오후";
  return { ampm, hh: pad2(h), mm: pad2(m) };
}

function buildAutoFields() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const yy = String(yyyy).slice(2);
  const mm = pad2(now.getMonth() + 1);
  const dd = pad2(now.getDate());
  const weekday = WEEKDAY_KR[now.getDay()];

  const startRaw = f_start_time.value || "14:00";
  const endRaw = f_end_time.value || "15:30";
  const start = timeToKorean(startRaw);
  const end = timeToKorean(endRaw);

  const targetOrg = f_target_org.value.trim();

  // 1. 일시 (문서용, 전체 표기)
  const datetime = `${yyyy}년 ${mm}월 ${dd}일 ${start.ampm} ${start.hh}시 ${start.mm}분 ~ ${end.hh}시 ${end.mm}분`;

  // 2. 이메일 제목용 날짜 (예: 260819)
  const email_date_short = `${yy}${mm}${dd}`;

  // 3. 이메일 본문용 날짜/시간 (예: 8월 19일 (수) 14시 00분)
  const email_date_long = `${now.getMonth() + 1}월 ${now.getDate()}일 (${weekday}) ${start.hh}시 ${start.mm}분`;

  // 4. 파일명 / 첨부파일명 (예: 260819 OOO자산운용 미팅)
  const file_base = `${email_date_short} ${targetOrg} 미팅`;

  return {
    datetime,
    ir_type: f_ir_type.value,
    target_org: targetOrg,
    attendees: "Noel, Judy",
    notes: document.getElementById("f_notes").value.trim() || "없음",
    sender_name: "Judy",
    file_base,
    email_date_short,
    email_date_long,
    attachment_base: file_base,
  };
}

// ---- 제출 ----
submitBtn.addEventListener("click", async () => {
  errorMsg.textContent = "";

  if (!selectedFile) {
    errorMsg.textContent = "녹취록 txt 파일을 먼저 올려주세요.";
    return;
  }

  const targetOrg = f_target_org.value.trim();
  if (!targetOrg) {
    errorMsg.textContent = "IR 대상기관을 입력해주세요.";
    return;
  }

  const fields = buildAutoFields();

  const formData = new FormData();
  formData.append("transcript", selectedFile);
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v));

  submitBtn.disabled = true;
  submitBtnText.textContent = "처리 중...";

  resultEmpty.hidden = true;
  resultDone.hidden = true;
  stamp.classList.remove("is-stamped");
  resultLoading.hidden = false;
  startLoadingMessages();

  try {
    const res = await fetch("/api/process", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "알 수 없는 오류가 발생했습니다.");
    }

    renderResult(data);
  } catch (e) {
    errorMsg.textContent = e.message;
    resultLoading.hidden = true;
    resultEmpty.hidden = false;
  } finally {
    stopLoadingMessages();
    submitBtn.disabled = false;
    submitBtnText.textContent = "Q&A 정리 시작";
  }
});

function renderResult(data) {
  resultLoading.hidden = true;
  resultDone.hidden = false;

  resultMetaText.textContent = `Q&A ${data.qa_count}개 추출 완료 · job ${data.job_id}`;

  topicList.innerHTML = "";
  data.topics.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    topicList.appendChild(li);
  });

  downloadDocx.href = `/api/download/${data.job_id}/${encodeURIComponent(data.files.docx)}`;
  downloadEmail.href = `/api/download/${data.job_id}/${encodeURIComponent(data.files.email)}`;

  requestAnimationFrame(() => {
    stamp.classList.add("is-stamped");
  });
}
