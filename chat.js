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
  const text = input.value.trim();

  if (!text) return;

  input.value = "";

  const { error } = await supabaseClient.from("live_chat").insert({
    user_id: currentUserId,
    sender: "Visitor",
    message: text,
    is_admin: false,
  });

  if (error) {
    console.error(error);
    alert("Message failed to send.");
  }
}

function messageBubble(msg) {
  return `
    <div class="${msg.is_admin ? "bot-msg" : "user-msg"}">
      ${escapeHTML(msg.message)}
      <small>${formatTime(msg.created_at)}</small>
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

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
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

document.getElementById("chatInput")?.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    sendChat();
  }
});
