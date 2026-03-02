const WS_URL = "wss://iufptw48l1.execute-api.us-east-1.amazonaws.com/production/";

const chatbox = document.getElementById("chatbox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const suggestionsContainer = document.getElementById("suggestions");

let sessionId = null;
let socket = null;
let currentBotMessage = null;

// --- Connect WebSocket ---
function connectWebSocket() {
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log("WebSocket connected");
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.session_id) sessionId = data.session_id;

    // Stream text
    if (data.text) {
      if (!currentBotMessage) {
        currentBotMessage = addMessage("bot", "");
      }
      currentBotMessage.innerHTML += data.text.replace(/\n/g, "<br>");
      chatbox.scrollTop = chatbox.scrollHeight;
    }

    // Show citations at end
    if (data.citations) {
      addCitations(data.citations);
      currentBotMessage = null; // reset for next response
    }
  };

  socket.onclose = () => {
    console.log("WebSocket closed. Reconnecting...");
    setTimeout(connectWebSocket, 2000);
  };

  socket.onerror = (err) => {
    console.error("WebSocket error:", err);
  };
}

// --- Helpers ---
function addMessage(sender, text = "") {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerHTML = text;
  chatbox.appendChild(msg);
  chatbox.scrollTop = chatbox.scrollHeight;
  return msg;
}

function addCitations(citations) {
  if (!citations || citations.length === 0) return;

  const container = document.createElement("div");
  container.className = "citations";
  container.innerHTML = "<strong>Referenced Documents:</strong>";

  citations.forEach(cite => {
    const link = document.createElement("a");
    link.href = cite.url;
    link.target = "_blank";
    link.textContent = cite.title;
    link.style.display = "block";
    link.style.marginTop = "4px";
    container.appendChild(link);
  });

  chatbox.appendChild(container);
}

// --- Send Message ---
function sendMessage() {
  const userMessage = messageInput.value.trim();
  if (!userMessage || !socket || socket.readyState !== WebSocket.OPEN) return;

  addMessage("user", userMessage);
  messageInput.value = "";

  currentBotMessage = addMessage("bot", "");

  socket.send(JSON.stringify({
    action: "sendMessage",
    message: userMessage,
    session_id: sessionId
  }));
}

// --- Init ---
window.addEventListener("DOMContentLoaded", () => {
  connectWebSocket();
});

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});