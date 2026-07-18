let homepageAnnouncements = [];
let currentAnnouncement = 0;
let autoSlide;

const isAdminAnnouncementPage = document.getElementById("announcementTitle");

const isHomePage = document.getElementById("announcementContainer");

if (isAdminAnnouncementPage) {
  loadAnnouncements();
}

if (isHomePage) {
  loadHomepageAnnouncements();
}

async function publishAnnouncement() {
  const title = document.getElementById("announcementTitle").value.trim();
  const content = document.getElementById("announcementContent").value.trim();
  const category = document.getElementById("announcementCategory").value;
  const pinned = document.getElementById("announcementPinned").checked;
  const file = document.getElementById("announcementFile").files[0];
  const editing = window.editingAnnouncementId;

  if (!title || !content) {
    alert("Please enter a title and announcement.");
    return;
  }

  const button = document.querySelector(
    'button[onclick="publishAnnouncement()"]',
  );

  button.disabled = true;
  button.textContent = "Publishing...";

  let image_url = "";
  let attachment_url = "";

  if (file) {
    const filePath = `announcements/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("announcement-files")
      .upload(filePath, file);

    if (uploadError) {
      console.error(uploadError);

      alert("Failed to upload attachment.");

      button.disabled = false;
      button.textContent = "Publish Announcement";
      return;
    }

    const { data } = supabaseClient.storage
      .from("announcement-files")
      .getPublicUrl(filePath);

    if (file.type.startsWith("image/")) {
      image_url = data.publicUrl;
    } else {
      attachment_url = data.publicUrl;
    }
  }

  let result;

  if (editing) {
    result = await supabaseClient
      .from("announcements")
      .update({
        title,
        content,
        category,
        pinned,
      })
      .eq("id", editing);

    window.editingAnnouncementId = null;
  } else {
    result = await supabaseClient.from("announcements").insert({
      title,
      content,
      category,
      pinned,
      published: true,
      image_url,
      attachment_url,
    });
  }

  const { error } = result;

  button.disabled = false;
  button.textContent = "Publish Announcement";

  if (error) {
    console.error(error);
    alert("Failed to publish announcement.");
    return;
  }

  alert(editing ? "Announcement updated!" : "Announcement published!");

  document.querySelector(
    'button[onclick="publishAnnouncement()"]',
  ).textContent = "Publish Announcement";
  document.getElementById("announcementTitle").value = "";
  document.getElementById("announcementContent").value = "";
  document.getElementById("announcementCategory").selectedIndex = 0;
  document.getElementById("announcementPinned").checked = false;
  document.getElementById("announcementFile").value = "";

  if (typeof loadAnnouncements === "function") {
    loadAdminAnnouncements();
  }
}

let announcements = [];
//let currentAnnouncement = 0;
//let autoSlide;

async function loadAnnouncements() {
  const { data, error } = await supabaseClient
    .from("announcements")
    .select("*")
    .eq("published", true)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  announcements = data || [];

  if (!announcements.length) return;

  const section = document.getElementById("announcementSection");

  if (section) {
    section.style.display = "block";
  }

  renderAnnouncement();

  createDots();

  startSlider();
}

async function loadHomepageAnnouncements() {
  const container = document.getElementById("announcementContainer");

  if (!container) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("announcements")
    .select("*")
    .eq("published", true)
    .order("pinned", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  //console.log("Announcements:", data);

  if (error) {
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    return;
  }

  homepageAnnouncements = data;

  renderHomepageAnnouncement();

  createAnnouncementDots();

  startAnnouncementSlider();
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);

  return `${days} days ago`;
}

function renderHomepageAnnouncement() {
  const container = document.getElementById("announcementContainer");

  if (!container) {
    return;
  }

  const item = homepageAnnouncements[currentAnnouncement];

  const timeAgo = getTimeAgo(item.created_at);

  container.innerHTML = `

    <div class="announcement-card ${item.pinned ? "pinned-announcement" : ""}">


    <p class="announcement-time">
    ${timeAgo}
</p>
        ${item.image_url ? `<img src="${item.image_url}">` : ""}


        <div class="announcement-content">

            <span class="announcement-category">
                ${item.pinned ? "📌 Important" : item.category}
            </span>


            <h2>
                ${item.title}
            </h2>


            <p>
${item.content.substring(0, 120)}
${item.content.length > 120 ? "..." : ""}
</p>


${
  item.content.length > 120
    ? `
<button onclick="openAnnouncementModal(${currentAnnouncement})">
    Read More
</button>
`
    : ""
}


            ${
              item.attachment_url
                ? `
            <a href="${item.attachment_url}"
            target="_blank"
            class="read-more-btn">
            Open Attachment
            </a>
            `
                : ""
            }


        </div>


    </div>

    `;
}

function createAnnouncementDots() {
  const dots = document.getElementById("announcementDots");

  // Only run on homepage
  if (!dots) {
    return;
  }

  dots.innerHTML = "";

  homepageAnnouncements.forEach((item, index) => {
    const dot = document.createElement("span");

    dot.onclick = () => {
      currentAnnouncement = index;

      renderHomepageAnnouncement();

      updateAnnouncementDots();

      startAnnouncementSlider();
    };

    dots.appendChild(dot);
  });

  updateAnnouncementDots();
}

function updateAnnouncementDots() {
  const dots = document.querySelectorAll("#announcementDots span");

  dots.forEach((dot) => {
    dot.classList.remove("active");
  });

  if (dots[currentAnnouncement]) {
    dots[currentAnnouncement].classList.add("active");
  }
}

function nextAnnouncement() {
  if (!homepageAnnouncements.length) {
    return;
  }

  currentAnnouncement++;

  if (currentAnnouncement >= homepageAnnouncements.length) {
    currentAnnouncement = 0;
  }

  renderAnnouncement();
}

function startAnnouncementSlider() {
  clearInterval(autoSlide);

  autoSlide = setInterval(nextAnnouncement, 5000);
}

function renderAnnouncement() {
  const a = announcements[currentAnnouncement];

  const container = document.getElementById("announcementContainer");

  if (!container) return;

  const shortContent =
    a.content.length > 180 ? a.content.substring(0, 180) + "..." : a.content;

  container.innerHTML = `

        <div class="announcement-card">

            ${a.image_url ? `<img src="${a.image_url}" class="announcement-image">` : ""}

            <div class="announcement-content">

                ${
                  a.pinned
                    ? `<div class="announcement-category">📌 Important</div>`
                    : `<div class="announcement-category">${a.category}</div>`
                }

                <h2>${a.title}</h2>

                <p>${shortContent}</p>

                <small>
                    ${formatTimeAgo(a.created_at)}
                </small>

                <div class="announcement-actions">

                    <button
                        class="read-more-btn"
                        onclick="openAnnouncementModal(${currentAnnouncement})">

                        Read More

                    </button>

                    ${
                      a.attachment_url
                        ? `
                        <a
                            class="attachment-btn"
                            href="${a.attachment_url}"
                            target="_blank">

                            📄 Attachment

                        </a>`
                        : ""
                    }

                </div>

            </div>

        </div>

    `;

  updateDots();
}

function openAnnouncementModal(index) {
  const a = homepageAnnouncements[index];

  if (!a) return;

  document.getElementById("modalTitle").textContent = a.title;

  document.getElementById("modalCategory").textContent = a.category;

  document.getElementById("modalDate").textContent = getTimeAgo(a.created_at);

  document.getElementById("modalContent").innerHTML = a.content.replace(
    /\n/g,
    "<br>",
  );

  const img = document.getElementById("modalImage");

  if (a.image_url) {
    img.src = a.image_url;
    img.style.display = "block";
  } else {
    img.style.display = "none";
  }

  document.getElementById("announcementModal").style.display = "flex";
}

function closeAnnouncementModal() {
  document.getElementById("announcementModal").style.display = "none";
}
function nextAnnouncement() {
  if (!homepageAnnouncements.length) {
    return;
  }

  currentAnnouncement++;

  if (currentAnnouncement >= homepageAnnouncements.length) {
    currentAnnouncement = 0;
  }

  renderHomepageAnnouncement();

  updateAnnouncementDots();
}

function prevAnnouncement() {
  if (!homepageAnnouncements.length) {
    return;
  }

  currentAnnouncement--;

  if (currentAnnouncement < 0) {
    currentAnnouncement = homepageAnnouncements.length - 1;
  }

  renderHomepageAnnouncement();

  updateAnnouncementDots();

  startAnnouncementSlider();
}

const nextBtn = document.getElementById("nextAnnouncement");
const prevBtn = document.getElementById("prevAnnouncement");

if (nextBtn) {
  nextBtn.onclick = nextAnnouncement;
}

if (prevBtn) {
  prevBtn.onclick = prevAnnouncement;
}

function startSlider() {
  clearInterval(autoSlide);

  autoSlide = setInterval(nextAnnouncement, 5000);
}

function createDots() {
  const dots = document.getElementById("announcementDots");

  // Stop if this is not the homepage
  if (!dots) {
    return;
  }

  dots.innerHTML = "";

  announcements.forEach((_, index) => {
    dots.innerHTML += `
            <span onclick="goToAnnouncement(${index})"></span>
        `;
  });

  updateDots();
}

function goToAnnouncement(index) {
  currentAnnouncement = index;

  renderHomepageAnnouncement();

  startSlider();
}

function updateDots() {
  const dots = document.querySelectorAll("#announcementDots span");

  if (!dots.length) {
    return;
  }

  dots.forEach((dot) => {
    dot.classList.remove("active");
  });

  if (dots[currentAnnouncement]) {
    dots[currentAnnouncement].classList.add("active");
  }
}

async function loadAdminAnnouncements() {
  const list = document.getElementById("announcementList");

  if (!list) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("announcements")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(error);

    list.innerHTML = "Failed to load announcements";

    return;
  }

  list.innerHTML = "";

  data.forEach((item) => {
    list.innerHTML += `

        <div class="admin-announcement-card">


            ${
              item.pinned
                ? `<span class="pin">
            📌 Pinned
            </span>`
                : ""
            }


            <h3>
            ${escapeHTML(item.title)}
            </h3>


            <span>
            ${escapeHTML(item.category)}
            </span>


            <p>
            ${escapeHTML(item.content.substring(0, 150))}
            </p>


            <small>
            ${formatDate(item.created_at)}
            </small>



            <div class="actions">


                <button onclick="editAnnouncement('${item.id}')">
                ✏ Edit
                </button>


                <button 
                class="delete-btn"
                onclick="deleteAnnouncement('${item.id}')">
                🗑 Delete
                </button>


            </div>


        </div>

        `;
  });
}

async function deleteAnnouncement(id) {
  const confirmDelete = confirm("Delete this announcement?");

  if (!confirmDelete) {
    return;
  }

  const { error } = await supabaseClient
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);

    alert("Failed to delete announcement");

    return;
  }

  alert("Announcement deleted");

  // refresh admin list
  loadAdminAnnouncements();

  // refresh homepage if loaded
  if (typeof loadAnnouncements === "function") {
    loadAnnouncements();
  }
}

async function editAnnouncement(id) {
  const { data, error } = await supabaseClient
    .from("announcements")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);

    return;
  }

  document.getElementById("announcementTitle").value = data.title;

  document.getElementById("announcementContent").value = data.content;

  document.getElementById("announcementCategory").value = data.category;

  document.getElementById("announcementPinned").checked = data.pinned;

  window.editingAnnouncementId = id;

  const btn = document.querySelector('button[onclick="publishAnnouncement()"]');

  btn.textContent = "Update Announcement";
}

if (document.getElementById("announcementList")) {
  loadAnnouncements();
}

if (document.getElementById("announcementContainer")) {
  loadHomepageAnnouncements();
}
supabaseClient
  .channel("announcements-live")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "announcements",
    },
    () => {
      if (document.getElementById("announcementList")) {
        loadAnnouncements();
      }

      if (document.getElementById("announcementContainer")) {
        loadHomepageAnnouncements();
      }
    },
  )
  .subscribe();

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("announcementList")) {
    loadAdminAnnouncements();
  }
});
function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function formatDate(date) {
  if (!date) {
    return "Unknown date";
  }

  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
