function toggleChat() {
  document.getElementById("chatBox").classList.toggle("show-chat");
}

function sendChat() {
  const input = document.getElementById("chatInput");
  const messages = document.getElementById("chatMessages");

  const text = input.value.trim();
  if (!text) return;

  messages.innerHTML += `<div class="user-msg">${text}</div>`;
  input.value = "";

  setTimeout(() => {
    messages.innerHTML += `
      <div class="bot-msg">
        Thanks for reaching out. An admin will respond soon.
      </div>
    `;
    messages.scrollTop = messages.scrollHeight;
  }, 800);

  messages.scrollTop = messages.scrollHeight;
}
