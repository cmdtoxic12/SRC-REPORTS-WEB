const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  message.textContent = "Logging in...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    message.textContent = "❌ " + error.message;
    return;
  }

  message.textContent = "✅ Login successful";
  window.location.href = "admin.html";
});

async function loginWithGoogle() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/admin.html",
    },
  });

  if (error) {
    message.textContent = "❌ " + error.message;
  }
}

async function forgotPassword() {
  const email = document.getElementById("email").value.trim();

  if (!email) {
    message.textContent = "Enter your email first.";
    return;
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/login.html",
  });

  if (error) {
    message.textContent = "❌ " + error.message;
  } else {
    message.textContent = "✅ Password reset link sent to your email.";
  }
}
