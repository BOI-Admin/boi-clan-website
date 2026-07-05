const firebaseConfig = {
  apiKey: "AIzaSyCMWaZu3ryQW9YwqppwKlVMCQcuRplnInM",
  authDomain: "bois-2dd9f.firebaseapp.com",
  projectId: "bois-2dd9f",
  databaseURL: "https://bois-2dd9f-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "bois-2dd9f.firebasestorage.app",
  messagingSenderId: "20201490773",
  appId: "1:20201490773:web:61514536c3846380cb87dc"
};

const STORAGE_KEYS = {
  members: "boiClanMembers",
  beats: "boiClanBeats",
  chat: "boiClanChat"
};

let db = null;
let useFallbackStorage = false;

function showStatusNotice(message, isError = false) {
  const notice = document.getElementById("statusNotice");
  if (!notice) return;
  notice.textContent = message;
  notice.className = "status-note" + (isError ? " error" : " visible");
}

function saveLocalData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Could not save local data:", error);
  }
}

function loadLocalData(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch (error) {
    console.warn("Could not load local data:", error);
    return fallbackValue;
  }
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).map(([id, item]) => ({ id, ...(item || {}) }));
}

function initializeFirebase() {
  try {
    if (!window.firebase) throw new Error("Firebase SDK not loaded");

    if (firebase.apps.length) {
      firebase.apps.forEach(app => app.delete());
    }

    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    useFallbackStorage = false;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    useFallbackStorage = true;
    showStatusNotice("Using offline storage for members and chat while the database is unavailable.", true);
  }
}

initializeFirebase();


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
function renderMembers(members) {
  let box = document.getElementById("membersContainer");
  if (!box) return;

  let memberCount = 0;
  box.innerHTML = "";

  members.forEach(member => {
    memberCount++;
    let el = document.createElement("div");
    el.className = "card";
    const memberId = member.id || member.key || "";
    const deleteButton = isAdmin && memberId
      ? "<button class='delete-btn small' onclick='removeMember(\"" + memberId + "\")'>Remove</button>"
      : "";
    el.innerHTML = "<h3>" + (member.name || "Guest") + "</h3><p>" + (member.role || "Member") + "</p>" + deleteButton;
    box.appendChild(el);
  });

  let countEl = document.getElementById("memberCount");
  if (countEl) countEl.innerText = memberCount;
}

function joinClan() {
  let name = document.getElementById("username").value;
  let role = document.getElementById("role").value;

  if (!name) return;

  const memberRecord = { name: name, role: role, id: Date.now().toString() };

  if (useFallbackStorage || !db) {
    const members = loadLocalData(STORAGE_KEYS.members, []);
    members.push(memberRecord);
    saveLocalData(STORAGE_KEYS.members, members);
    renderMembers(members);
    showStatusNotice("Saved to local members list.");
  } else {
    db.ref("members").push({
      name: name,
      role: role
    }).then(() => {
      loadMembers();
      showStatusNotice("Joined BOI Clan and synced to the community.");
    }).catch((error) => {
      console.error("Members write failed:", error);
      useFallbackStorage = true;
      const members = loadLocalData(STORAGE_KEYS.members, []);
      members.push(memberRecord);
      saveLocalData(STORAGE_KEYS.members, members);
      renderMembers(members);
      showStatusNotice("Saved to local members list because the database could not be reached.", true);
    });
  }

  document.getElementById("result").innerText =
    "Welcome " + name + " (" + role + ")";

  document.getElementById("username").value = "";
}

// LIVE MEMBERS LOAD
function loadMembers() {
  if (useFallbackStorage || !db) {
    renderMembers(loadLocalData(STORAGE_KEYS.members, []));
    return;
  }

  db.ref("members").on("value", (snap) => {
    const members = normalizeList(snap.val());
    renderMembers(members);
    saveLocalData(STORAGE_KEYS.members, members);
  }, (error) => {
    console.error("Members database error:", error);
    useFallbackStorage = true;
    showStatusNotice("Members list is using local storage because the database is unavailable.", true);
    renderMembers(loadLocalData(STORAGE_KEYS.members, []));
  });
}

loadMembers();


// =========================
// 🎵 BEATS SYSTEM
// =========================
function renderBeats(beats) {
  let box = document.getElementById("beatsContainer");
  if (!box) return;

  box.innerHTML = "";

  beats.forEach(beat => {
    let beatEl = document.createElement("div");
    beatEl.className = "beat-card";
    beatEl.innerHTML =
      "<h4>" + (beat.title || "Untitled") + "</h4>" +
      "<p class='artist'>by " + (beat.artist || "Unknown") + "</p>" +
      "<p class='plays'>🔥 " + (beat.plays || 0) + " plays</p>";

    box.appendChild(beatEl);
  });
}

function loadBeats() {
  if (useFallbackStorage || !db) {
    const savedBeats = loadLocalData(STORAGE_KEYS.beats, []);
    if (!savedBeats.length) {
      const initialBeats = [
        { title: "Midnight Vibes", artist: "Producer K", plays: 3420 },
        { title: "Electric Dreams", artist: "Beat Master J", plays: 2890 },
        { title: "Cosmic Flow", artist: "DJ Luna", plays: 2445 },
        { title: "Street Anthem", artist: "Rapper X", plays: 1980 }
      ];
      saveLocalData(STORAGE_KEYS.beats, initialBeats);
      renderBeats(initialBeats);
    } else {
      renderBeats(savedBeats);
    }
    return;
  }

  db.ref("beats").once("value", (snap) => {
    const beats = normalizeList(snap.val());
    if (!beats.length) {
      const initialBeats = [
        { title: "Midnight Vibes", artist: "Producer K", plays: 3420 },
        { title: "Electric Dreams", artist: "Beat Master J", plays: 2890 },
        { title: "Cosmic Flow", artist: "DJ Luna", plays: 2445 },
        { title: "Street Anthem", artist: "Rapper X", plays: 1980 }
      ];
      initialBeats.forEach(beat => db.ref("beats").push(beat));
      renderBeats(initialBeats);
      saveLocalData(STORAGE_KEYS.beats, initialBeats);
      return;
    }

    renderBeats(beats);
    saveLocalData(STORAGE_KEYS.beats, beats);
  }, (error) => {
    console.error("Beats database error:", error);
    useFallbackStorage = true;
    showStatusNotice("Beats are showing from local storage because the database is unavailable.", true);
    renderBeats(loadLocalData(STORAGE_KEYS.beats, []));
  });
}

loadBeats();


// =========================
// 💬 CHAT SYSTEM
// =========================
function renderChat(messages) {
  let box = document.getElementById("chatBox");
  if (!box) return;

  box.innerHTML = "";

  messages.forEach(message => {
    let msgKey = message.id;
    let timestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : "";

    let msg = document.createElement("div");
    msg.className = "chat-message";
    const deleteButton = isAdmin && msgKey
      ? "<button class='delete-btn small' onclick=\"deleteMessage('" + msgKey + "')\">Remove</button>"
      : "<button class='delete-btn' onclick=\"deleteMessage('" + msgKey + "')\">✕</button>";
    msg.innerHTML =
      "<div class='msg-header'>" +
      "<b>" + (message.name || "Guest") + "</b>" +
      "<span class='msg-time'>" + timestamp + "</span>" +
      deleteButton +
      "</div>" +
      "<p>" + (message.message || "") + "</p>";

    box.appendChild(msg);
  });

  box.scrollTop = box.scrollHeight;
}

function sendMessage() {
  let name = document.getElementById("chatName").value;
  let message = document.getElementById("chatMessage").value;

  if (!name || !message) return;

  const chatRecord = {
    id: Date.now().toString(),
    name: name,
    message: message,
    timestamp: new Date().getTime()
  };

  if (useFallbackStorage || !db) {
    const chatMessages = loadLocalData(STORAGE_KEYS.chat, []);
    chatMessages.push(chatRecord);
    saveLocalData(STORAGE_KEYS.chat, chatMessages);
    renderChat(chatMessages);
  } else {
    db.ref("chat").push({
      name: name,
      message: message,
      timestamp: new Date().getTime()
    }).then(() => {
      loadChat();
      showStatusNotice("Your message was sent to the chat.");
    }).catch((error) => {
      console.error("Chat write failed:", error);
      useFallbackStorage = true;
      const chatMessages = loadLocalData(STORAGE_KEYS.chat, []);
      chatMessages.push(chatRecord);
      saveLocalData(STORAGE_KEYS.chat, chatMessages);
      renderChat(chatMessages);
      showStatusNotice("Saved your message locally because the database could not be reached.", true);
    });
  }

  document.getElementById("chatMessage").value = "";
}

function deleteMessage(msgKey) {
  if (useFallbackStorage || !db) {
    const chatMessages = loadLocalData(STORAGE_KEYS.chat, []).filter(message => message.id !== msgKey);
    saveLocalData(STORAGE_KEYS.chat, chatMessages);
    renderChat(chatMessages);
    return;
  }

  db.ref("chat/" + msgKey).remove().then(() => {
    loadChat();
  }).catch((error) => {
    console.error("Chat delete failed:", error);
    useFallbackStorage = true;
    const chatMessages = loadLocalData(STORAGE_KEYS.chat, []).filter(message => message.id !== msgKey);
    saveLocalData(STORAGE_KEYS.chat, chatMessages);
    renderChat(chatMessages);
    showStatusNotice("Removed the message locally because the database could not be reached.", true);
  });
}

let isAdmin = false;

function unlockAdmin() {
  const adminPassword = prompt("Enter admin password:");
  if (adminPassword === "boiadmin") {
    isAdmin = true;
    document.getElementById("adminStatus").textContent = "Admin access unlocked.";
    document.getElementById("adminControls").style.display = "block";
    renderMembers(loadLocalData(STORAGE_KEYS.members, []));
    renderChat(loadLocalData(STORAGE_KEYS.chat, []));
    showStatusNotice("Admin access unlocked.");
  } else {
    document.getElementById("adminStatus").textContent = "Wrong password. Admin access remains locked.";
    showStatusNotice("Wrong password.", true);
  }
}

function removeMember(memberId) {
  if (!isAdmin) return;

  if (useFallbackStorage || !db) {
    const members = loadLocalData(STORAGE_KEYS.members, []).filter(member => (member.id || member.key) !== memberId);
    saveLocalData(STORAGE_KEYS.members, members);
    renderMembers(members);
    showStatusNotice("Member removed.");
    return;
  }

  db.ref("members/" + memberId).remove().then(() => {
    const members = loadLocalData(STORAGE_KEYS.members, []).filter(member => (member.id || member.key) !== memberId);
    saveLocalData(STORAGE_KEYS.members, members);
    renderMembers(members);
    showStatusNotice("Member removed.");
  }).catch((error) => {
    console.error("Could not remove member:", error);
    showStatusNotice("Could not remove member.", true);
  });
}

function clearMembers() {
  if (!isAdmin) return;

  if (useFallbackStorage || !db) {
    saveLocalData(STORAGE_KEYS.members, []);
    renderMembers([]);
  } else {
    db.ref("members").remove().then(() => {
      saveLocalData(STORAGE_KEYS.members, []);
      renderMembers([]);
      showStatusNotice("Members cleared.");
    }).catch((error) => {
      console.error("Could not clear members:", error);
      showStatusNotice("Could not clear members.", true);
    });
  }
}

function clearChat() {
  if (!isAdmin) return;

  if (useFallbackStorage || !db) {
    saveLocalData(STORAGE_KEYS.chat, []);
    renderChat([]);
  } else {
    db.ref("chat").remove().then(() => {
      saveLocalData(STORAGE_KEYS.chat, []);
      renderChat([]);
      showStatusNotice("Chat cleared.");
    }).catch((error) => {
      console.error("Could not clear chat:", error);
      showStatusNotice("Could not clear chat.", true);
    });
  }
}

// LIVE CHAT LOAD
function loadChat() {
  if (useFallbackStorage || !db) {
    renderChat(loadLocalData(STORAGE_KEYS.chat, []));
    return;
  }

  db.ref("chat").on("value", (snap) => {
    const chatMessages = normalizeList(snap.val());
    renderChat(chatMessages);
    saveLocalData(STORAGE_KEYS.chat, chatMessages);
  }, (error) => {
    console.error("Chat database error:", error);
    useFallbackStorage = true;
    showStatusNotice("Chat is using local storage because the database is unavailable.", true);
    renderChat(loadLocalData(STORAGE_KEYS.chat, []));
  });
}

loadChat();