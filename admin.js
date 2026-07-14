const adminList = document.getElementById("adminList");

let allReports = [];
let currentPage = 1;
const pageSize = 10;

async function loadAdminReports() {
  adminList.innerHTML = "Loading...";

  const { data, error } = await supabaseClient
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    adminList.innerHTML = "Failed to load concerns.";
    console.error(error);
    return;
  }

  allReports = data || [];
  updateStats();
  renderReports();
}

function renderReports() {
  let reports = [...allReports];

  const search =
    document.getElementById("searchInput")?.value.toLowerCase() || "";
  const type = document.getElementById("typeFilter")?.value || "";
  const status = document.getElementById("statusFilter")?.value || "";
  const sort = document.getElementById("sortFilter")?.value || "newest";

  if (search) {
    reports = reports.filter(
      (r) =>
        r.title?.toLowerCase().includes(search) ||
        r.description?.toLowerCase().includes(search) ||
        r.name?.toLowerCase().includes(search),
    );
  }

  if (type) reports = reports.filter((r) => r.type === type);
  if (status) reports = reports.filter((r) => r.status === status);

  if (sort === "oldest") {
    reports.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  if (sort === "pending") {
    reports.sort((a, b) => (a.status === "Pending" ? -1 : 1));
  }

  if (sort === "resolved") {
    reports.sort((a, b) => (a.status === "Resolved" ? -1 : 1));
  }

  if (sort === "recentReply") {
    reports.sort(
      (a, b) => new Date(b.replied_at || 0) - new Date(a.replied_at || 0),
    );
  }

  const start = (currentPage - 1) * pageSize;
  const paginated = reports.slice(start, start + pageSize);

  adminList.innerHTML = "";

  paginated.forEach((report) => {
    adminList.innerHTML += `
      <div class="card">
        <h3>${escapeHTML(report.title)}</h3>

        <span>${escapeHTML(report.type)}</span>
        <span class="${getStatusClass(report.status)}">${escapeHTML(report.status)}</span>

        <div class="report-details">
          <p><strong>Submitted by:</strong> ${escapeHTML(report.name || "Anonymous")}</p>
          <p><strong>Email:</strong> ${escapeHTML(report.email || "Not provided")}</p>
          <p><strong>Date:</strong> ${formatDate(report.created_at)}</p>
          <p><strong>Category:</strong> ${escapeHTML(report.category || "None")}</p>

          <h4>Description</h4>
<p>${escapeHTML(report.description)}</p>

${
  report.attachments
    ?.map(
      (file) => `

<div class="attachment-item">

${
  file.type.startsWith("image/")
    ? `<img
src="${file.url}"
class="report-image"
onclick="openImage('${file.url}')">`
    : `<a href="${file.url}" target="_blank">
📎 ${file.name}
</a>`
}

</div>

`,
    )
    .join("") || ""
}
        </div>

        <select id="status-${report.id}">
          <option ${report.status === "Pending" ? "selected" : ""}>Pending</option>
          <option ${report.status === "In Review" ? "selected" : ""}>In Review</option>
          <option ${report.status === "Resolved" ? "selected" : ""}>Resolved</option>
          <option ${report.status === "Rejected" ? "selected" : ""}>Rejected</option>
        </select>

        <h4>Admin Reply</h4>
        <textarea id="reply-${report.id}" placeholder="Write admin reply...">${escapeHTML(report.admin_reply || "")}</textarea>

        <button onclick="saveReply('${report.id}')">Save</button>
        <button class="deleteBtn" onclick="deleteReport('${report.id}')">Delete</button>
      </div>
    `;
  });

  renderPagination(reports.length);
}

function renderPagination(total) {
  const totalPages = Math.ceil(total / pageSize);

  adminList.innerHTML += `
    <div class="pagination">
      <button onclick="prevPage()" ${currentPage === 1 ? "disabled" : ""}>Prev</button>
      <span>Page ${currentPage} of ${totalPages || 1}</span>
      <button onclick="nextPage(${totalPages})" ${currentPage === totalPages || totalPages === 0 ? "disabled" : ""}>Next</button>
    </div>
  `;
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderReports();
  }
}

function nextPage(totalPages) {
  if (currentPage < totalPages) {
    currentPage++;
    renderReports();
  }
}

async function saveReply(id) {
  const status = document.getElementById(`status-${id}`).value;
  const reply = document.getElementById(`reply-${id}`).value.trim();

  const { error } = await supabaseClient
    .from("reports")
    .update({
      status,
      admin_reply: reply,
      replied_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    showToast("Failed to save reply", "error");
    console.error(error);
    return;
  }

  showToast("Reply saved successfully", "success");
  loadAdminReports();
}

async function deleteReport(id) {
  if (!confirm("Delete this report permanently?")) return;

  const { error } = await supabaseClient.from("reports").delete().eq("id", id);

  if (error) {
    showToast("Failed to delete report", "error");
    console.error(error);
    return;
  }

  showToast("Report deleted", "success");
  loadAdminReports();
}

function updateStats() {
  document.getElementById("totalReports").textContent = allReports.length;
  document.getElementById("pendingReports").textContent = allReports.filter(
    (r) => r.status === "Pending",
  ).length;
  document.getElementById("resolvedReports").textContent = allReports.filter(
    (r) => r.status === "Resolved",
  ).length;
  document.getElementById("rejectedReports").textContent = allReports.filter(
    (r) => r.status === "Rejected",
  ).length;
}

function exportCSV() {
  let csv =
    "Title,Type,Status,Category,Name,Email,Description,Admin Reply,Created At\n";

  allReports.forEach((r) => {
    csv += `"${cleanCSV(r.title)}","${cleanCSV(r.type)}","${cleanCSV(r.status)}","${cleanCSV(r.category)}","${cleanCSV(r.name)}","${cleanCSV(r.email)}","${cleanCSV(r.description)}","${cleanCSV(r.admin_reply)}","${cleanCSV(r.created_at)}"\n`;
  });

  downloadFile(csv, "reports.csv", "text/csv");
}

function exportExcel() {
  let table = `
    <table>
      <tr>
        <th>Title</th><th>Type</th><th>Status</th><th>Category</th>
        <th>Name</th><th>Email</th><th>Description</th><th>Admin Reply</th><th>Created At</th>
      </tr>
  `;

  async function markMessagesAsRead(userId) {
    const { data, error } = await supabaseClient
      .from("live_chat")
      .update({
        is_read: true,
      })
      .eq("user_id", userId)
      .eq("is_admin", false)
      .select();

    console.log("Updated:", data);

    if (error) {
      console.error("Read update failed:", error);
    }
  }

  allReports.forEach((r) => {
    table += `
      <tr>
        <td>${escapeHTML(r.title)}</td>
        <td>${escapeHTML(r.type)}</td>
        <td>${escapeHTML(r.status)}</td>
        <td>${escapeHTML(r.category)}</td>
        <td>${escapeHTML(r.name)}</td>
        <td>${escapeHTML(r.email)}</td>
        <td>${escapeHTML(r.description)}</td>
        <td>${escapeHTML(r.admin_reply)}</td>
        <td>${escapeHTML(r.created_at)}</td>
      </tr>
    `;
  });

  table += "</table>";

  downloadFile(table, "reports.xls", "application/vnd.ms-excel");
}

function exportPDF() {
  const win = window.open("", "_blank");

  win.document.write(`
    <html>
    <head>
      <title>Reports PDF</title>
      <style>
        body { font-family: Arial; padding: 30px; }
        .item { border-bottom: 1px solid #ccc; padding: 15px 0; }
      </style>
    </head>
    <body>
      <h1>ConcernHub Reports</h1>
      ${allReports
        .map(
          (r) => `
        <div class="item">
          <h3>${escapeHTML(r.title)}</h3>
          <p><strong>Type:</strong> ${escapeHTML(r.type)}</p>
          <p><strong>Status:</strong> ${escapeHTML(r.status)}</p>
          <p><strong>Description:</strong> ${escapeHTML(r.description)}</p>
          <p><strong>Admin Reply:</strong> ${escapeHTML(r.admin_reply || "No reply")}</p>
        </div>
      `,
        )
        .join("")}
    </body>
    </html>
  `);

  win.document.close();
  win.print();
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function getStatusClass(status) {
  if (status === "Pending") return "pending";
  if (status === "In Review") return "review";
  if (status === "Resolved") return "resolved";
  if (status === "Rejected") return "rejected";
  return "";
}

function formatDate(date) {
  if (!date) return "Unknown";
  return new Date(date).toLocaleString();
}

function cleanCSV(value) {
  return String(value || "").replace(/"/g, '""');
}

function openImage(url) {
  const overlay = document.createElement("div");

  overlay.className = "image-modal";

  overlay.innerHTML = `
    <div class="image-modal-content">
      <span class="close-image">&times;</span>

      <img src="${url}">
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector(".close-image").onclick = () => overlay.remove();

  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("input", (e) => {
  if (
    e.target.id === "searchInput" ||
    e.target.id === "typeFilter" ||
    e.target.id === "statusFilter" ||
    e.target.id === "sortFilter"
  ) {
    currentPage = 1;
    renderReports();
  }
});

loadAdminReports();
