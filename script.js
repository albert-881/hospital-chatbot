const WS_URL = "wss://iufptw48l1.execute-api.us-east-1.amazonaws.com/production/";

const chatbox = document.getElementById("chatbox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const suggestionsContainer = document.getElementById("suggestions");
const clearBtn = document.getElementById("clearBtn");

let sessionId = null;
let socket = null;
let currentBotMessage = null;

// --- Connect WebSocket ---
function connectWebSocket() {
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log("WebSocket connected");
    // Request knowledge base documents immediately
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: "getDocs" }));
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Received:", data); // Debug log

    if (data.session_id) sessionId = data.session_id;

    // Handle different message types
    switch(data.type) {
      case 'text_delta':
        if (!currentBotMessage) {
            currentBotMessage = addMessage("bot", "");
        }

        // If placeholder is still there, replace it with first chunk
        if (currentBotMessage.innerHTML.includes("...")) {
            currentBotMessage.innerHTML = ""; // remove placeholder
        }

        // Append streaming text
        currentBotMessage.innerHTML += data.content.replace(/\n/g, "<br>");
        break;

      case 'stream_end':
        // Streaming finished
        console.log("Stream ended");
        break;

      case 'citations':
        // Show citations
        addCitations(data.citations);
        currentBotMessage = null; // Reset for next response
        break;

      case 'error':
        // Handle errors
        if (!currentBotMessage) {
          currentBotMessage = addMessage("bot", "");
        }
        currentBotMessage.innerHTML = `<span style="color: red;">Error: ${data.message}</span>`;
        currentBotMessage = null;
        break;

      case 'docs_list':  // <-- NEW
        const kbList = document.getElementById("kb-docs");
        if (!kbList) return;
    
        kbList.innerHTML = "";  // clear old docs
    
        data.documents.forEach(doc => {
          const li = document.createElement("li");
          li.innerHTML = `<a href="${doc.url}" target="_blank">📄 ${doc.name}</a>`;
          kbList.appendChild(li);
        });
        break;

      default:
        // Fallback for old format (if any)
        if (data.text) {
          if (!currentBotMessage) {
            currentBotMessage = addMessage("bot", "");
          }
          currentBotMessage.innerHTML += data.text.replace(/\n/g, "<br>");
          chatbox.scrollTop = chatbox.scrollHeight;
        }
        
        if (data.citations) {
          addCitations(data.citations);
          currentBotMessage = null;
        }
        break;
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

  // Add user message
  addMessage("user", userMessage);
  messageInput.value = "";

  // Create bot message placeholder immediately with "waiting" text
  currentBotMessage = addMessage("bot", "...");

  // Scroll to top of the new bot message
  chatbox.scrollTop = currentBotMessage.offsetTop;

  // Send message to WebSocket
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
clearBtn.addEventListener("click", () => {
  chatbox.innerHTML = "";   // clears all messages
});

document.addEventListener("click", function(e) {
  if (e.target.classList.contains("suggestion-btn")) {

    const suggestionText = e.target.innerText;

    // Put suggestion into the input
    messageInput.value = suggestionText;

    // Send the message
    sendMessage();
  }
});
