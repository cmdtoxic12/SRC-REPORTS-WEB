const trackForm = document.getElementById("trackForm");
const trackingInput = document.getElementById("trackingInput");
const trackButton = document.getElementById("trackButton");
const trackMessage = document.getElementById("trackMessage");
const trackingResult = document.getElementById("trackingResult");

trackForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const trackingId = trackingInput.value.trim().toUpperCase();

  if (!trackingId) {
    showTrackMessage("Enter your tracking ID.", "error");
    hideTrackingResult();
    return;
  }

  await findReport(trackingId);
});

async function findReport(trackingId) {
  setLoading(true);
  hideTrackingResult();
  showTrackMessage("Searching for your report...", "loading");

  const { data, error } = await supabaseClient
    .from("reports")
    .select(
      `
      tracking_id,
      title,
      description,
      type,
      category,
      status,
      admin_reply,
      created_at,
      replied_at
    `,
    )
    .eq("tracking_id", trackingId)
    .maybeSingle();

  setLoading(false);

  if (error) {
    console.error("Tracking error:", error);
    showTrackMessage("Unable to track the report right now.", "error");
    return;
  }

  if (!data) {
    showTrackMessage(
      "No report was found with that tracking ID. Check the ID and try again.",
      "error",
    );
    return;
  }

  showTrackMessage("Report found successfully.", "success");
  displayReport(data);
}

function displayReport(report) {
  const status = normalizeStatus(report.status);
  const timeline = buildTimeline(status);

  trackingResult.innerHTML = `
    <article class="tracked-report-card">

      <div class="tracked-report-header">
        <div>
          <span class="tracked-label">Tracking ID</span>

          <div class="tracking-code-row">
            <h2>${escapeHTML(report.tracking_id)}</h2>

            <button
              type="button"
              class="copy-track-button"
              onclick="copyTrackingId('${escapeAttribute(report.tracking_id)}')"
            >
              Copy
            </button>
          </div>
        </div>

        <span class="status-badge ${getStatusClass(status)}">
          ${getStatusIcon(status)}
          ${escapeHTML(status)}
        </span>
      </div>

      <div class="tracked-report-grid">

        <div class="tracked-detail">
          <span>Title</span>
          <strong>${escapeHTML(report.title)}</strong>
        </div>

        <div class="tracked-detail">
          <span>Type</span>
          <strong>${escapeHTML(report.type || "Not specified")}</strong>
        </div>

        <div class="tracked-detail">
          <span>Category</span>
          <strong>${escapeHTML(report.category || "General")}</strong>
        </div>

        <div class="tracked-detail">
          <span>Submitted</span>
          <strong>${formatDate(report.created_at)}</strong>
        </div>

      </div>

      <div class="tracked-description">
        <h3>Description</h3>
        <p>${escapeHTML(report.description)}</p>
      </div>

      <div class="tracking-timeline-section">
        <h3>Report Progress</h3>
        <div class="tracking-timeline">
          ${timeline}
        </div>
      </div>

      <div class="tracked-reply">
        <h3>Admin Reply</h3>

        ${
          report.admin_reply
            ? `
              <div class="reply">
                <p>${escapeHTML(report.admin_reply)}</p>

                ${
                  report.replied_at
                    ? `<small>Replied ${formatDate(report.replied_at)}</small>`
                    : ""
                }
              </div>
            `
            : `
              <div class="no-tracked-reply">
                <span>💬</span>
                <p>No admin reply yet.</p>
                <small>Please check again later.</small>
              </div>
            `
        }
      </div>

    </article>
  `;

  trackingResult.hidden = false;

  trackingResult.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function buildTimeline(status) {
  const stages = [
    {
      name: "Submitted",
      description: "Your report was successfully received.",
    },
    {
      name: "Pending",
      description: "The report is waiting for administrative review.",
    },
    {
      name: "In Review",
      description: "An administrator is reviewing your concern.",
    },
    {
      name: "Resolved",
      description: "The concern has been handled and closed.",
    },
  ];

  let activeIndex = getTimelineIndex(status);

  return stages
    .map((stage, index) => {
      let state = "upcoming";

      if (index < activeIndex) {
        state = "completed";
      } else if (index === activeIndex) {
        state = status === "Resolved" ? "completed" : "current";
      }

      if (status === "Rejected" && index === 3) {
        return `
          <div class="timeline-item rejected-step">
            <div class="timeline-marker">✕</div>

            <div class="timeline-content">
              <strong>Rejected</strong>
              <p>The report was reviewed but could not be approved.</p>
            </div>
          </div>
        `;
      }

      return `
        <div class="timeline-item ${state}">
          <div class="timeline-marker">
            ${state === "completed" ? "✓" : index + 1}
          </div>

          <div class="timeline-content">
            <strong>${stage.name}</strong>
            <p>${stage.description}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

function getTimelineIndex(status) {
  switch (status) {
    case "Pending":
      return 1;

    case "In Review":
      return 2;

    case "Resolved":
      return 3;

    case "Rejected":
      return 3;

    default:
      return 1;
  }
}

function normalizeStatus(status) {
  const value = String(status || "Pending")
    .trim()
    .toLowerCase();

  if (value === "in review") return "In Review";
  if (value === "resolved") return "Resolved";
  if (value === "rejected") return "Rejected";

  return "Pending";
}

function getStatusClass(status) {
  switch (status) {
    case "In Review":
      return "review";

    case "Resolved":
      return "resolved";

    case "Rejected":
      return "rejected";

    default:
      return "pending";
  }
}

function getStatusIcon(status) {
  switch (status) {
    case "In Review":
      return "🔵";

    case "Resolved":
      return "✅";

    case "Rejected":
      return "❌";

    default:
      return "🟡";
  }
}

async function copyTrackingId(trackingId) {
  try {
    await navigator.clipboard.writeText(trackingId);
    showTrackMessage("Tracking ID copied.", "success");
  } catch (error) {
    console.error("Copy error:", error);

    const temporaryInput = document.createElement("input");
    temporaryInput.value = trackingId;

    document.body.appendChild(temporaryInput);
    temporaryInput.select();
    document.execCommand("copy");
    temporaryInput.remove();

    showTrackMessage("Tracking ID copied.", "success");
  }
}

function showTrackMessage(message, type = "") {
  trackMessage.textContent = message;
  trackMessage.className = `track-message ${type}`;
}

function hideTrackingResult() {
  trackingResult.hidden = true;
  trackingResult.innerHTML = "";
}

function setLoading(isLoading) {
  trackButton.disabled = isLoading;
  trackButton.textContent = isLoading ? "Searching..." : "Track Report";
}

function formatDate(date) {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");
}
