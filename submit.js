const form = document.getElementById("reportForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const report = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    type: document.getElementById("type").value,
    category: document.getElementById("category").value.trim(),
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
  };

  const { error } = await supabaseClient.from("reports").insert(report);

  if (error) {
    message.textContent = "❌ Failed to submit concern.";
    console.error(error);
  } else {
    message.textContent = "✅ Concern submitted successfully.";
    form.reset();
  }
});
