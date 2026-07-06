const totalReports = document.getElementById("totalReports");
const totalIdeas = document.getElementById("totalIdeas");
const totalIssues = document.getElementById("totalIssues");
const totalResolved = document.getElementById("totalResolved");
const totalPending = document.getElementById("totalPending");
const recentReports = document.getElementById("recentReports");

async function loadHomeStats() {
  const { data, error } = await supabaseClient
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const reports = data || [];

  totalReports.textContent = reports.length;
  totalIdeas.textContent = reports.filter(r => r.type === "Idea").length;
  totalIssues.textContent = reports.filter(r => r.type === "Issue").length;
  totalResolved.textContent = reports.filter(r => r.status === "Resolved").length;
  totalPending.textContent = reports.filter(r => r.status === "Pending").length;

  recentReports.innerHTML = "";

  reports.slice(0, 3).forEach(report => {
    recentReports.innerHTML += `
      <div class="card">
        <h3>${report.title}</h3>
        <p>${report.description}</p>
        <span>${report.type}</span>
        <span>${report.status}</span>
      </div>
    `;
  });
}

loadHomeStats();