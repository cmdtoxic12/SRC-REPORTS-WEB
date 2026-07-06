const adminList = document.getElementById("adminList");

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

  adminList.innerHTML = "";

  data.forEach(report => {
    adminList.innerHTML += `
      <div class="card">
        <h3>${report.title}</h3>
        <p>${report.description}</p>
        <p><strong>Type:</strong> ${report.type}</p>
        <p><strong>Status:</strong> ${report.status}</p>

        <select id="status-${report.id}">
          <option ${report.status === "Pending" ? "selected" : ""}>Pending</option>
          <option ${report.status === "In Review" ? "selected" : ""}>In Review</option>
          <option ${report.status === "Resolved" ? "selected" : ""}>Resolved</option>
          <option ${report.status === "Rejected" ? "selected" : ""}>Rejected</option>
        </select>

        <textarea id="reply-${report.id}" placeholder="Write admin reply...">${report.admin_reply || ""}</textarea>

        <button onclick="saveReply('${report.id}')">Save Reply</button>
      </div>
    `;
  });
}

async function saveReply(id) {
  const status = document.getElementById(`status-${id}`).value;
  const reply = document.getElementById(`reply-${id}`).value.trim();

  const { error } = await supabaseClient
    .from("reports")
    .update({
      status: status,
      admin_reply: reply,
      replied_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    alert("Failed to save reply.");
    console.error(error);
  } else {
    alert("Reply saved successfully.");
    loadAdminReports();
  }
}

loadAdminReports();