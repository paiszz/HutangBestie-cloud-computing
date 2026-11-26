let state = {
  friends: [],
  debts: [],
  reminders: [],
  summary: {},
  activeTab: "debts",
  selectedReminderMeta: null,
};

const formatIDR = (num) => "Rp " + Number(num || 0).toLocaleString("id-ID");

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2600);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Terjadi kesalahan pada server");
  }
  return data;
}

async function loadAll() {
  const [summary, friends, debts, reminders] = await Promise.all([
    api("/api/summary"),
    api("/api/friends"),
    api("/api/debts"),
    api("/api/reminders"),
  ]);
  state.summary = summary;
  state.friends = friends;
  state.debts = debts;
  state.reminders = reminders;

  renderSummary();
  renderDebts();
  renderFriends();
  renderReminders();
  populateSelects();
}

function renderSummary() {
  const s = state.summary;
  document.getElementById("kpi-total-piutang").textContent = formatIDR(s.total_piutang);
  document.getElementById("kpi-unpaid-count").textContent = `${s.unpaid_count || 0} transaksi belum lunas`;
  document.getElementById("kpi-friends-unpaid").textContent = `${s.friends_unpaid_count || 0} Orang`;
  document.getElementById("kpi-total-friends").textContent = `Dari total ${s.total_friends || 0} teman terdaftar`;
  document.getElementById("kpi-paid-count").textContent = `${s.paid_count || 0} Transaksi`;
  document.getElementById("kpi-reminders-count").textContent = `${s.total_reminders || 0} pengingat tersimpan`;
}

function switchTab(tab) {
  state.activeTab = tab;
  ["debts", "friends", "reminders"].forEach((t) => {
    const btn = document.getElementById(`tab-${t}`);
    const panel = document.getElementById(`panel-${t}`);
    const active = t === tab;
    btn.setAttribute("aria-selected", active ? "true" : "false");
    btn.className = active
      ? "cursor-pointer px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-white border border-borderc transition-colors duration-150"
      : "cursor-pointer px-4 py-2 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white hover:bg-elevated transition-colors duration-150";
    panel.classList.toggle("hidden", !active);
  });
  document.getElementById("debts-controls").classList.toggle("hidden", tab !== "debts");
}

function renderDebts() {
  const query = (document.getElementById("search-input").value || "").toLowerCase();
  const statusFilter = document.getElementById("status-filter").value;
  const tbody = document.getElementById("debts-tbody");

  const filtered = state.debts.filter((d) => {
    const matchText =
      d.friend_name.toLowerCase().includes(query) ||
      d.description.toLowerCase().includes(query);
    const matchStatus = statusFilter === "ALL" || d.status === statusFilter;
    return matchText && matchStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-[#94A3B8]">Belum ada catatan utang yang sesuai.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((d) => {
      const isPaid = d.status === "Lunas";
      const badge = isPaid
        ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/15 text-accent border border-accent/30">Lunas</span>`
        : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30">Belum Lunas</span>`;

      return `
        <tr class="hover:bg-elevated/60 transition-colors duration-150">
          <td class="py-3.5 px-4 font-medium text-white">${d.friend_name}</td>
          <td class="py-3.5 px-4 text-slate-300">${d.description}</td>
          <td class="py-3.5 px-4 font-mono text-xs text-[#94A3B8]">${d.date}</td>
          <td class="py-3.5 px-4 font-mono font-semibold text-white">${formatIDR(d.amount)}</td>
          <td class="py-3.5 px-4">${badge}</td>
          <td class="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
            ${!isPaid ? `<button onclick="quickTagih(${d.id})" class="cursor-pointer px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-medium border border-amber-500/30">Tagih</button>` : ""}
            ${!isPaid ? `<button onclick="settleDebt(${d.id})" class="cursor-pointer px-2.5 py-1 rounded bg-accent/15 hover:bg-accent/25 text-accent text-xs font-medium border border-accent/30">Lunas</button>` : ""}
            <button onclick="editDebt(${d.id})" class="cursor-pointer px-2.5 py-1 rounded bg-secondary hover:bg-slate-700 text-slate-200 text-xs border border-borderc">Edit</button>
            <button onclick="deleteDebt(${d.id})" class="cursor-pointer px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/25 text-red-400 text-xs border border-red-500/30">Hapus</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderFriends() {
  const container = document.getElementById("panel-friends");
  if (state.friends.length === 0) {
    container.innerHTML = `<div class="col-span-full bg-surface border border-borderc rounded-xl p-8 text-center text-[#94A3B8]">Belum ada teman terdaftar.</div>`;
    return;
  }

  container.innerHTML = state.friends
    .map((f) => {
      const hasDebt = f.total_unpaid > 0;
      return `
        <div class="bg-surface border border-borderc rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-slate-500 transition-colors duration-200">
          <div>
            <div class="flex items-start justify-between gap-2">
              <div>
                <h3 class="font-bold text-white text-base">${f.name}</h3>
                <p class="text-xs text-[#94A3B8]">Panggilan: ${f.nickname} &bull; <span class="font-mono">${f.phone}</span></p>
              </div>
              <span class="px-2 py-0.5 rounded-full text-xs font-mono ${hasDebt ? "bg-red-500/15 text-red-400 border border-red-500/30" : "bg-accent/15 text-accent border border-accent/30"}">
                ${f.unpaid_count} aktif
              </span>
            </div>
            <div class="mt-4 pt-3 border-t border-borderc/60 flex items-center justify-between">
              <span class="text-xs text-[#94A3B8]">Total Belum Lunas</span>
              <span class="font-mono font-bold ${hasDebt ? "text-amber-400" : "text-accent"}">${formatIDR(f.total_unpaid)}</span>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2">
            <button onclick="openDebtModal(${f.id})" class="cursor-pointer px-3 py-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent text-xs font-medium border border-accent/30">+ Utang</button>
            <button onclick="editFriend(${f.id})" class="cursor-pointer px-3 py-1.5 rounded-lg bg-secondary hover:bg-slate-700 text-slate-200 text-xs border border-borderc">Edit</button>
            <button onclick="deleteFriend(${f.id})" class="cursor-pointer px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 text-xs border border-red-500/30">Hapus</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderReminders() {
  const container = document.getElementById("panel-reminders");
  if (state.reminders.length === 0) {
    container.innerHTML = `<div class="bg-surface border border-borderc rounded-xl p-8 text-center text-[#94A3B8]">Belum ada riwayat pengingat tersimpan.</div>`;
    return;
  }

  container.innerHTML = state.reminders
    .map(
      (r) => `
      <div class="bg-surface border border-borderc rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2 text-xs text-[#94A3B8]">
            <span class="font-semibold text-white">${r.friend_name}</span>
            <span>&bull;</span>
            <span>${r.debt_description} (${formatIDR(r.debt_amount)})</span>
            <span>&bull;</span>
            <span class="font-mono">${r.sent_date}</span>
          </div>
          <p class="text-sm text-slate-200 italic">"${r.message_template}"</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button onclick="copyText('${r.message_template.replace(/'/g, "\\'")}')" class="cursor-pointer px-3 py-1.5 rounded-lg bg-secondary hover:bg-slate-700 text-xs text-white border border-borderc">Salin</button>
          <button onclick="editReminderPrompt(${r.id})" class="cursor-pointer px-3 py-1.5 rounded-lg bg-secondary hover:bg-slate-700 text-xs text-white border border-borderc">Edit</button>
          <button onclick="deleteReminder(${r.id})" class="cursor-pointer px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 text-xs border border-red-500/30">Hapus</button>
        </div>
      </div>
    `
    )
    .join("");
}

function populateSelects() {
  const friendSelect = document.getElementById("debt-friend");
  friendSelect.innerHTML = state.friends
    .map((f) => `<option value="${f.id}">${f.name} (${f.nickname})</option>`)
    .join("");

  const genDebtSelect = document.getElementById("gen-debt-select");
  const unpaid = state.debts.filter((d) => d.status !== "Lunas");
  const list = unpaid.length ? unpaid : state.debts;
  genDebtSelect.innerHTML = list
    .map((d) => `<option value="${d.id}">${d.friend_name} — ${d.description} (${formatIDR(d.amount)})</option>`)
    .join("");
}

// Modals & CRUD Handlers
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function openFriendModal() {
  document.getElementById("friend-modal-title").textContent = "Tambah Teman";
  document.getElementById("friend-id").value = "";
  document.getElementById("friend-form").reset();
  document.getElementById("friend-modal").classList.remove("hidden");
}

function editFriend(id) {
  const f = state.friends.find((x) => x.id === id);
  if (!f) return;
  document.getElementById("friend-modal-title").textContent = "Edit Data Teman";
  document.getElementById("friend-id").value = f.id;
  document.getElementById("friend-name").value = f.name;
  document.getElementById("friend-nickname").value = f.nickname;
  document.getElementById("friend-phone").value = f.phone;
  document.getElementById("friend-modal").classList.remove("hidden");
}

async function submitFriend(e) {
  e.preventDefault();
  const id = document.getElementById("friend-id").value;
  const payload = {
    name: document.getElementById("friend-name").value,
    nickname: document.getElementById("friend-nickname").value,
    phone: document.getElementById("friend-phone").value,
  };
  try {
    if (id) {
      await api(`/api/friends/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      showToast("Data teman diperbarui");
    } else {
      await api("/api/friends", { method: "POST", body: JSON.stringify(payload) });
      showToast("Teman baru ditambahkan");
    }
    closeModal("friend-modal");
    await loadAll();
  } catch (err) {
    showToast(err.message);
  }
}

async function deleteFriend(id) {
  if (!confirm("Hapus teman ini beserta catatan utangnya?")) return;
  await api(`/api/friends/${id}`, { method: "DELETE" });
  showToast("Teman dihapus");
  await loadAll();
}

function openDebtModal(preselectedFriendId = null) {
  if (state.friends.length === 0) {
    showToast("Tambahkan teman terlebih dahulu!");
    openFriendModal();
    return;
  }
  document.getElementById("debt-modal-title").textContent = "Catat Utang Baru";
  document.getElementById("debt-id").value = "";
  document.getElementById("debt-form").reset();
  document.getElementById("debt-date").value = new Date().toISOString().slice(0, 10);
  if (preselectedFriendId) {
    document.getElementById("debt-friend").value = String(preselectedFriendId);
  }
  document.getElementById("debt-modal").classList.remove("hidden");
}

function editDebt(id) {
  const d = state.debts.find((x) => x.id === id);
  if (!d) return;
  document.getElementById("debt-modal-title").textContent = "Edit Catatan Utang";
  document.getElementById("debt-id").value = d.id;
  document.getElementById("debt-friend").value = d.friend_id;
  document.getElementById("debt-amount").value = d.amount;
  document.getElementById("debt-desc").value = d.description;
  document.getElementById("debt-date").value = d.date;
  document.getElementById("debt-status").value = d.status;
  document.getElementById("debt-modal").classList.remove("hidden");
}

async function submitDebt(e) {
  e.preventDefault();
  const id = document.getElementById("debt-id").value;
  const payload = {
    friend_id: Number(document.getElementById("debt-friend").value),
    amount: Number(document.getElementById("debt-amount").value),
    description: document.getElementById("debt-desc").value,
    date: document.getElementById("debt-date").value,
    status: document.getElementById("debt-status").value,
  };
  try {
    if (id) {
      await api(`/api/debts/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      showToast("Catatan utang diperbarui");
    } else {
      await api("/api/debts", { method: "POST", body: JSON.stringify(payload) });
      showToast("Utang baru dicatat & total diperbarui");
    }
    closeModal("debt-modal");
    await loadAll();
  } catch (err) {
    showToast(err.message);
  }
}

async function settleDebt(id) {
  await api(`/api/debts/${id}/settle`, { method: "POST" });
  showToast("Mantap! Utang ditandai Lunas");
  await loadAll();
}

async function deleteDebt(id) {
  if (!confirm("Hapus catatan utang ini?")) return;
  await api(`/api/debts/${id}`, { method: "DELETE" });
  showToast("Catatan utang dihapus");
  await loadAll();
}

// Reminder Generator
async function quickTagih(debtId) {
  document.getElementById("gen-debt-select").value = String(debtId);
  await generateReminderText();
  document.getElementById("reminder-generator").scrollIntoView({ behavior: "smooth" });
}

async function generateReminderText() {
  const debtId = document.getElementById("gen-debt-select").value;
  const tone = document.getElementById("gen-tone-select").value;
  if (!debtId) return showToast("Belum ada data utang untuk ditagih");
  try {
    const res = await api("/api/reminders/generate", {
      method: "POST",
      body: JSON.stringify({ debt_id: Number(debtId), tone }),
    });
    state.selectedReminderMeta = { friend_id: res.friend_id, debt_id: res.debt_id };
    document.getElementById("gen-message-box").value = res.message_template;
  } catch (err) {
    showToast(err.message);
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text);
  showToast("Pesan disalin ke clipboard!");
}

function copyGeneratedMessage() {
  const msg = document.getElementById("gen-message-box").value.trim();
  if (!msg) return showToast("Generate pesan terlebih dahulu");
  copyText(msg);
}

async function saveGeneratedReminder() {
  const msg = document.getElementById("gen-message-box").value.trim();
  const debtId = Number(document.getElementById("gen-debt-select").value);
  const debt = state.debts.find((d) => d.id === debtId);
  if (!msg || !debt) return showToast("Generate pesan terlebih dahulu");

  await api("/api/reminders", {
    method: "POST",
    body: JSON.stringify({
      friend_id: debt.friend_id,
      debt_id: debt.id,
      message_template: msg,
    }),
  });
  showToast("Pesan pengingat disimpan ke Riwayat!");
  await loadAll();
}

async function editReminderPrompt(id) {
  const r = state.reminders.find((x) => x.id === id);
  if (!r) return;
  const updated = prompt("Edit pesan pengingat:", r.message_template);
  if (updated !== null && updated.trim()) {
    await api(`/api/reminders/${id}`, {
      method: "PUT",
      body: JSON.stringify({ message_template: updated.trim() }),
    });
    showToast("Pengingat diperbarui");
    await loadAll();
  }
}

async function deleteReminder(id) {
  await api(`/api/reminders/${id}`, { method: "DELETE" });
  showToast("Riwayat pengingat dihapus");
  await loadAll();
}

document.addEventListener("DOMContentLoaded", loadAll);
