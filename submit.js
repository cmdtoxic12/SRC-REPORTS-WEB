const form = document.getElementById("reportForm");
const message = document.getElementById("message");

function generateTrackingId() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const random = Math.floor(1000 + Math.random() * 9000);

  return `CH-${year}${month}${day}-${random}`;
}

const attachmentInput = document.getElementById("attachments");
const preview = document.getElementById("attachmentPreview");

attachmentInput.addEventListener("change", () => {
  preview.innerHTML = "";

  [...attachmentInput.files].forEach((file) => {
    const card = document.createElement("div");
    card.className = "attachment-card";

    if (file.type.startsWith("image/")) {
      card.innerHTML = `
                <img src="${URL.createObjectURL(file)}">
                <p>${file.name}</p>
            `;
    } else {
      card.innerHTML = `
                📄
                <p>${file.name}</p>
            `;
    }

    preview.appendChild(card);
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitButton = form.querySelector('button[type="submit"]');
  const trackingId = generateTrackingId();

  const attachments = [];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_FILES = 5;

  if (attachmentInput.files.length > MAX_FILES) {
    message.innerHTML = `<span class="error-message">You can upload a maximum of ${MAX_FILES} files.</span>`;
    submitButton.disabled = false;
    submitButton.textContent = "Submit";
    return;
  }

  for (const file of attachmentInput.files) {
    if (file.size > MAX_FILE_SIZE) {
      message.innerHTML = `<span class="error-message">${escapeHTML(file.name)} exceeds the 10MB limit.</span>`;
      submitButton.disabled = false;
      submitButton.textContent = "Submit";
      return;
    }

    const safeName = file.name.replace(/[^\w.-]/g, "_");

    const filePath = `${trackingId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("report-files")
      .upload(filePath, file);

    if (uploadError) {
      console.error(uploadError);

      submitButton.disabled = false;
      submitButton.textContent = "Submit";

      message.innerHTML = `
      <span class="error-message">
        ${escapeHTML(uploadError.message)}
      </span>
    `;

      return;
    }

    const { data } = supabaseClient.storage
      .from("report-files")
      .getPublicUrl(filePath);

    attachments.push({
      name: file.name,
      url: data.publicUrl,
      type: file.type,
      size: file.size,
    });
  }
  const report = {
    tracking_id: trackingId,
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    type: document.getElementById("type").value,
    category: document.getElementById("category").value.trim(),
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    attachments,
  };

  const { error } = await supabaseClient.from("reports").insert(report);

  submitButton.disabled = false;
  submitButton.textContent = "Submit";

  if (error) {
    console.error("Submission error:", error);
    message.innerHTML = `
      <span class="error-message">
        Failed to submit concern: ${escapeHTML(error.message)}
      </span>`;
    return;
  }

  message.innerHTML = `
    <div class="message">
      <h2>Report submitted successfully</h2>
      <p>Save this tracking ID:</p>
      <div class="generated-tracking-id">
        <strong>${escapeHTML(trackingId)}</strong>
        <button type="button" onclick="copyTrackingId('${trackingId}')">Copy ID</button>
      </div>
      <br><br>

<a class="track-btn"
href="track.html?tracking_id=${encodeURIComponent(trackingId)}">
Track Report →
</a>
    </div>`;

  form.reset();
  preview.innerHTML = "";
});

async function copyTrackingId(trackingId) {
  try {
    await navigator.clipboard.writeText(trackingId);
    showTemporaryMessage("Tracking ID copied.");
  } catch (error) {
    console.error("Clipboard error:", error);

    const temporaryInput = document.createElement("input");
    temporaryInput.value = trackingId;
    document.body.appendChild(temporaryInput);

    temporaryInput.select();
    document.execCommand("copy");
    temporaryInput.remove();

    showTemporaryMessage("Tracking ID copied.");
  }
}

function showTemporaryMessage(text) {
  const notice = document.createElement("div");
  notice.className = "copy-notice";
  notice.textContent = text;

  document.body.appendChild(notice);

  requestAnimationFrame(() => {
    notice.classList.add("show");
  });

  setTimeout(() => {
    notice.classList.remove("show");

    setTimeout(() => {
      notice.remove();
    }, 300);
  }, 2000);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
