const chatUsers = document.getElementById("chatUsers");
const adminChatMessages = document.getElementById("adminChatMessages");
const selectedChatTitle = document.getElementById("selectedChatTitle");

let selectedUserId = null;
let allChats = [];

async function loadChatUsers() {
  const { data, error } = await supabaseClient
    .from("live_chat")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    chatUsers.innerHTML = "Failed to load chats.";
    return;
  }

  allChats = data || [];

  const users = {};

  allChats.forEach((msg) => {
    if (!users[msg.user_id]) {
      users[msg.user_id] = msg;
    }
  });

  chatUsers.innerHTML = "";

  Object.values(users).forEach((user) => {
    chatUsers.innerHTML += `
      <div class="chat-user" onclick="openConversation('${user.user_id}')">
        <strong>${user.sender || "Visitor"}</strong>
        <p>${escapeHTML(user.message)}</p>
        <small>${formatTime(user.created_at)}</small>
      </div>
    `;
  });
}

async function openConversation(userId) {
  selectedUserId = userId;
  selectedChatTitle.textContent = "Conversation with Visitor";

  const { data, error } = await supabaseClient
    .from("live_chat")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  adminChatMessages.innerHTML = "";

  data.forEach((msg) => {
    adminChatMessages.innerHTML += messageBubble(msg);
  });

  adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
}

async function sendAdminReply() {
  const input = document.getElementById("adminChatInput");
  const text = input.value.trim();

  if (!selectedUserId) {
    alert("Select a conversation first.");
    return;
  }

  if (!text) return;

  input.value = "";

  const { error } = await supabaseClient.from("live_chat").insert({
    user_id: selectedUserId,
    sender: "Admin",
    message: text,
    is_admin: true,
  });

  if (error) {
    console.error(error);
    alert("Failed to send reply.");
  }
}

function listenAdminRealtime() {
  supabaseClient
    .channel("admin-live-chat")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "live_chat",
      },
      (payload) => {
        loadChatUsers();

        if (payload.new.user_id === selectedUserId) {
          adminChatMessages.innerHTML += messageBubble(payload.new);
          adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
        }
      },
    )
    .subscribe();
}

function messageBubble(msg) {
  return `
    <div class="${msg.is_admin ? "user-msg" : "bot-msg"}">
      ${escapeHTML(msg.message)}
      <small>${formatTime(msg.created_at)}</small>
    </div>
  `;
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

document.getElementById("adminChatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendAdminReply();
  }
});

loadChatUsers();
listenAdminRealtime();
