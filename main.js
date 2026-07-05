const firebaseConfig = {
  apiKey: "AIzaSyCMWaZu3ryQW9YwqppwKlVMCQcuRplnInM",
  authDomain: "bois-2dd9f.firebaseapp.com",
  projectId: "bois-2dd9f",
  storageBucket: "bois-2dd9f.firebasestorage.app",
  messagingSenderId: "20201490773",
  appId: "1:20201490773:web:61514536c3846380cb87dc"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();


// =========================
// 📄 PAGE NAVIGATION
// =========================
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const pageName = btn.dataset.page;
    
    // Hide all pages
    document.querySelectorAll(".page").forEach(page => {
      page.classList.remove("active");
    });
    
    // Show selected page
    document.getElementById(pageName).classList.add("active");
    
    // Update active nav button
    document.querySelectorAll(".nav-btn").forEach(b => {
      b.classList.remove("active");
    });
    btn.classList.add("active");
  });
});


// =========================
// 👥 JOIN SYSTEM (MEMBERS)
// =========================
function joinClan() {
  let name = document.getElementById("username").value;
  let role = document.getElementById("role").value;

  if (!name) return;

  db.ref("members").push({
    name: name,
    role: role
  });

  document.getElementById("result").innerText =
    "Welcome " + name + " (" + role + ")";

  document.getElementById("username").value = "";
}


// LIVE MEMBERS LOAD
db.ref("members").on("value", (snap) => {
  let box = document.getElementById("membersContainer");
  if (!box) return;
  
  let memberCount = 0;
  box.innerHTML = "";

  snap.forEach(child => {
    memberCount++;
    let d = child.val();

    let el = document.createElement("div");
    el.className = "card";
    el.innerHTML = "<h3>" + d.name + "</h3><p>" + d.role + "</p>";

    box.appendChild(el);
  });

  let countEl = document.getElementById("memberCount");
  if (countEl) countEl.innerText = memberCount;
});


// =========================
// 🎵 BEATS SYSTEM
// =========================
// Load initial beats data
db.ref("beats").once("value", (snap) => {
  if (!snap.exists()) {
    const initialBeats = [
      { title: "Midnight Vibes", artist: "Producer K", plays: 3420 },
      { title: "Electric Dreams", artist: "Beat Master J", plays: 2890 },
      { title: "Cosmic Flow", artist: "DJ Luna", plays: 2445 },
      { title: "Street Anthem", artist: "Rapper X", plays: 1980 }
    ];

    initialBeats.forEach(beat => {
      db.ref("beats").push(beat);
    });
  }
});

// LIVE BEATS LOAD
db.ref("beats").on("value", (snap) => {
  let box = document.getElementById("beatsContainer");
  if (!box) return;
  
  box.innerHTML = "";

  snap.forEach(child => {
    let d = child.val();

    let beat = document.createElement("div");
    beat.className = "beat-card";
    beat.innerHTML = 
      "<h4>" + d.title + "</h4>" +
      "<p class='artist'>by " + d.artist + "</p>" +
      "<p class='plays'>🔥 " + d.plays + " plays</p>";

    box.appendChild(beat);
  });
});


// =========================
// 💬 CHAT SYSTEM
// =========================
function sendMessage() {
  let name = document.getElementById("chatName").value;
  let message = document.getElementById("chatMessage").value;

  if (!name || !message) return;

  db.ref("chat").push({
    name: name,
    message: message,
    timestamp: new Date().getTime()
  });

  document.getElementById("chatMessage").value = "";
}

function deleteMessage(msgKey) {
  db.ref("chat/" + msgKey).remove();
}


// LIVE CHAT LOAD
db.ref("chat").on("value", (snap) => {
  let box = document.getElementById("chatBox");
  if (!box) return;
  
  box.innerHTML = "";

  snap.forEach(child => {
    let d = child.val();
    let msgKey = child.key;
    let timestamp = d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : "";

    let msg = document.createElement("div");
    msg.className = "chat-message";
    msg.innerHTML = 
      "<div class='msg-header'>" +
      "<b>" + d.name + "</b>" +
      "<span class='msg-time'>" + timestamp + "</span>" +
      "<button class='delete-btn' onclick=\"deleteMessage('" + msgKey + "')\">✕</button>" +
      "</div>" +
      "<p>" + d.message + "</p>";

    box.appendChild(msg);
  });
  
  // Scroll to latest message
  box.scrollTop = box.scrollHeight;
});