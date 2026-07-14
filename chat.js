let currentUserId = localStorage.getItem("chat_user_id");

if (!currentUserId) {
  currentUserId = crypto.randomUUID();
  localStorage.setItem("chat_user_id", currentUserId);
}

async function loadChatMessages() {
  const messages = document.getElementById("chatMessages");

  const { data, error } = await supabaseClient
    .from("live_chat")
    .select("*")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  messages.innerHTML = "";

  data.forEach((msg) => {
    messages.innerHTML += messageBubble(msg);
  });

  messages.scrollTop = messages.scrollHeight;
}

function toggleChat() {
  document.getElementById("chatBox").classList.toggle("show-chat");
}

async function sendChat() {
  const input = document.getElementById("chatInput");
  const fileInput = document.getElementById("chatFile");
  const messages = document.getElementById("chatMessages");

  const text = input.value.trim();
  if (!text) return;

  let fileURL = null;

  // Upload file
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];

    const fileName = `${currentUserId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("chat-files")
      .upload(fileName, file);

    if (uploadError) {
      console.error(uploadError);
      alert("File upload failed");
      return;
    }

    const { data } = supabaseClient.storage
      .from("chat-files")
      .getPublicUrl(fileName);

    fileURL = data.publicUrl;
  }

  // Prevent empty messages
  if (!text && !fileURL) return;

  input.value = "";
  fileInput.value = "";

  const tempMsg = {
    message: text,
    is_admin: false,
    created_at: new Date().toISOString(),
  };

  //messages.innerHTML += messageBubble(tempMsg);
  // messages.scrollTop = messages.scrollHeight;

  const { error } = await supabaseClient.from("live_chat").insert({
    user_id: currentUserId,
    sender: "Visitor",
    message: text,
    is_admin: false,
    file_url: fileURL,
  });

  if (error) {
    console.error(error);
    alert("Message failed to save.");
  }
}

function messageBubble(msg) {
  let attachment = "";

  if (msg.file_url) {
    if (msg.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      attachment = `
        <br>
        <img 
          src="${msg.file_url}"
          style="
          max-width:200px;
          border-radius:10px;
          margin-top:8px;
          "
        >
      `;
    } else {
      attachment = `
        <br>
        <a 
        href="${msg.file_url}" 
        target="_blank">
        📎 Open Attachment
        </a>
      `;
    }
  }

  return `

    <div class="${msg.is_admin ? "bot-msg" : "user-msg"}">

      ${escapeHTML(msg.message)}

      ${attachment}

      <small>
${formatTime(msg.created_at)}

${msg.is_admin ? "" : msg.is_read ? " ✓✓" : " ✓"}

</small>

    </div>

  `;
}
function listenForMessages() {
  supabaseClient
    .channel("live-chat-user")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "live_chat",
        filter: `user_id=eq.${currentUserId}`,
      },
      (payload) => {
        const messages = document.getElementById("chatMessages");
        messages.innerHTML += messageBubble(payload.new);
        messages.scrollTop = messages.scrollHeight;
      },
    )
    .subscribe();
}

const emojiBtn = document.getElementById("emojiBtn");
const emojiContainer = document.getElementById("emojiContainer");
const emojiPicker = document.getElementById("emojiPicker");

emojiBtn.onclick = () => {
  emojiContainer.classList.toggle("show");
};

emojiPicker.addEventListener("emoji-click", (event) => {
  chatInput.value += event.detail.unicode;
  chatInput.focus();
});

document.addEventListener("click", (e) => {
  if (!emojiContainer.contains(e.target) && !emojiBtn.contains(e.target)) {
    emojiContainer.classList.remove("show");
  }
});

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function listenForReadReceipts() {
  supabaseClient
    .channel("read-status")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "live_chat",
        filter: `user_id=eq.${currentUserId}`,
      },
      (payload) => {
        loadChatMessages();
      },
    )
    .subscribe();
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadChatMessages();
listenForMessages();
listenForReadReceipts();

document.getElementById("chatInput")?.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    sendChat();
  }
});
