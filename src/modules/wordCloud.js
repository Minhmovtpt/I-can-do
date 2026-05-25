import { wordCloudApi } from "../core/firebase.js";

function normalizeVoterId(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function isPollOpen(pollState) {
  return Boolean(pollState?.isOpen) && Number(pollState?.endsAt || 0) > Date.now();
}

function computeTopThree(votesMap) {
  const counter = new Map();
  Object.values(votesMap || {}).forEach((entry) => {
    if (!entry?.value) return;
    counter.set(entry.value, (counter.get(entry.value) || 0) + 1);
  });

  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([value, count], index) => ({ rank: index + 1, value, count }));
}

function renderWordCloud(container, votesMap) {
  const counter = new Map();
  Object.values(votesMap || {}).forEach((entry) => {
    if (!entry?.value) return;
    counter.set(entry.value, (counter.get(entry.value) || 0) + 1);
  });

  container.innerHTML = "";
  if (!counter.size) {
    container.textContent = "Chưa có vote nào.";
    return;
  }

  const max = Math.max(...counter.values());
  [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([value, count]) => {
      const chip = document.createElement("span");
      chip.className = "word-cloud-item";
      const scale = 0.7 + (count / max) * 1.3;
      chip.style.fontSize = `${Math.round(scale * 16)}px`;
      chip.textContent = `${value} (${count})`;
      container.appendChild(chip);
    });
}

export function initWordCloud(elements, notifyError) {
  const state = { pollState: null, votes: {}, role: null, declaredVoterId: "" };

  const applyRoleUi = () => {
    const isAdmin = state.role === "admin";
    const isVoter = state.role === "voter";

    elements.wordCloudDurationInput.disabled = !isAdmin;
    elements.wordCloudStartBtn.hidden = !isAdmin;
    elements.wordCloudStopBtn.hidden = !isAdmin;

    elements.wordCloudVoterIdInput.disabled = !isVoter;
    elements.wordCloudVoteInput.disabled = !isVoter;
    elements.wordCloudVoteBtn.hidden = !isVoter;

    if (isVoter) {
      elements.wordCloudVoterIdInput.value = state.declaredVoterId;
      elements.wordCloudVoterIdInput.readOnly = true;
    }
  };

  const render = () => {
    const open = isPollOpen(state.pollState);
    const endsAt = Number(state.pollState?.endsAt || 0);
    elements.wordCloudStatus.textContent = open
      ? `Đang mở đến ${new Date(endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : "Đã đóng";

    elements.wordCloudVoteBtn.disabled = !open;

    renderWordCloud(elements.wordCloudCloud, state.votes);

    const topThree = computeTopThree(state.votes);
    elements.wordCloudTopList.innerHTML = "";
    if (!topThree.length) {
      const li = document.createElement("li");
      li.textContent = "Chưa đủ dữ liệu";
      elements.wordCloudTopList.appendChild(li);
    } else {
      topThree.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = `#${item.rank}: ${item.value} (${item.count} votes)`;
        elements.wordCloudTopList.appendChild(li);
      });
    }
  };

  wordCloudApi.subscribePollState((pollState) => {
    state.pollState = pollState;
    render();
  });

  wordCloudApi.subscribeVotes((votes) => {
    state.votes = votes || {};
    render();
  });

  elements.wordCloudSelectAdminBtn.addEventListener("click", () => {
    state.role = "admin";
    elements.wordCloudRolePopup.hidden = true;
    applyRoleUi();
  });

  elements.wordCloudSelectVoterBtn.addEventListener("click", () => {
    elements.wordCloudVoterDeclareArea.hidden = false;
  });

  elements.wordCloudConfirmVoterBtn.addEventListener("click", () => {
    const declaredId = normalizeVoterId(elements.wordCloudDeclareVoterIdInput.value);
    if (!declaredId) {
      notifyError(new Error("Vui lòng nhập số/mã voter"), "Thiếu mã voter");
      return;
    }
    state.role = "voter";
    state.declaredVoterId = declaredId;
    elements.wordCloudRolePopup.hidden = true;
    applyRoleUi();
  });

  elements.wordCloudStartBtn.addEventListener("click", async () => {
    try {
      const minutes = Number(elements.wordCloudDurationInput.value || 3);
      const durationMs = Math.max(1, minutes) * 60 * 1000;
      const now = Date.now();
      await wordCloudApi.setPollState({
        isOpen: true,
        startedAt: now,
        endsAt: now + durationMs,
      });
    } catch (error) {
      notifyError(error, "Không thể bắt đầu bình chọn");
    }
  });

  elements.wordCloudStopBtn.addEventListener("click", async () => {
    try {
      await wordCloudApi.setPollState({
        ...(state.pollState || {}),
        isOpen: false,
        endsAt: Date.now(),
      });
    } catch (error) {
      notifyError(error, "Không thể dừng bình chọn");
    }
  });

  elements.wordCloudVoteBtn.addEventListener("click", async () => {
    try {
      const voterId = normalizeVoterId(elements.wordCloudVoterIdInput.value);
      const value = String(elements.wordCloudVoteInput.value || "").trim();
      if (!voterId) throw new Error("Nhập mã người dùng");
      if (voterId !== state.declaredVoterId) throw new Error("Mã voter không khớp mã đã khai báo");
      if (!value) throw new Error("Nhập nội dung bình chọn");
      if (value.length > 3) throw new Error("Tối đa 3 ký tự");
      if (!isPollOpen(state.pollState)) throw new Error("Phiên bình chọn đã đóng");

      const result = await wordCloudApi.voteOnce(voterId, value);
      if (!result) throw new Error("Bạn đã vote trước đó");
      elements.wordCloudVoteInput.value = "";
    } catch (error) {
      notifyError(error, "Vote thất bại");
    }
  });

  setInterval(() => {
    if (isPollOpen(state.pollState)) {
      render();
      return;
    }
    if (state.pollState?.isOpen) {
      wordCloudApi.setPollState({ ...state.pollState, isOpen: false });
    }
    render();
  }, 1000);

  applyRoleUi();
  render();
}
