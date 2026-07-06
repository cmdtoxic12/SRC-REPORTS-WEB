const reportsList = document.getElementById("reportsList");
const filter = document.getElementById("filter");

async function loadReports() {
  reportsList.innerHTML = "Loading...";

  let query = supabaseClient
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter.value) {
    query = query.eq("type", filter.value);
  }

  const { data, error } = await query;

  if (error) {
    reportsList.innerHTML = "Failed to load reports.";
    console.error(error);
    return;
  }

  reportsList.innerHTML = "";

  data.forEach(report => {
    reportsList.innerHTML += `
      <div class="card">
        <h3>${report.title}</h3>
        <p>${report.description}</p>
        <span>${report.type}</span>
        <span>${report.status}</span>

        ${
          report.admin_reply
          ? `<div class="reply">
              <strong>Admin Reply:</strong>
              <p>${report.admin_reply}</p>
            </div>`
          : `<p class="no-reply">No admin reply yet.</p>`
        }
      </div>
    `;
  });
}

filter.addEventListener("change", loadReports);
loadReports();