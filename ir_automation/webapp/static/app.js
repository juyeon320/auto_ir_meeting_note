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

// ---- 제출 ----
submitBtn.addEventListener("click", async () => {
  errorMsg.textContent = "";

  if (!selectedFile) {
    errorMsg.textContent = "녹취록 txt 파일을 먼저 올려주세요.";
    return;
  }

  const fields = {
    datetime: document.getElementById("f_datetime").value.trim(),
    ir_type: document.getElementById("f_ir_type").value.trim(),
    target_org: document.getElementById("f_target_org").value.trim(),
    attendees: document.getElementById("f_attendees").value.trim(),
    notes: document.getElementById("f_notes").value.trim(),
    sender_name: document.getElementById("f_sender_name").value.trim(),
    file_base: document.getElementById("f_file_base").value.trim(),
    email_date_short: document.getElementById("f_email_date_short").value.trim(),
    email_date_long: document.getElementById("f_email_date_long").value.trim(),
    attachment_base: document.getElementById("f_attachment_base").value.trim(),
  };

  const required = ["datetime", "target_org", "attendees", "sender_name", "file_base", "email_date_short", "email_date_long", "attachment_base"];
  for (const key of required) {
    if (!fields[key]) {
      errorMsg.textContent = "미팅 정보 / 이메일 정보를 모두 채워주세요.";
      return;
    }
  }

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

  // 도장 애니메이션
  requestAnimationFrame(() => {
    stamp.classList.add("is-stamped");
  });
}
