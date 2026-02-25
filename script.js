// Replace with your Lambda Function URL
const LAMBDA_URL = "https://744omkgp7soasyumfsxlx6cixq0bzvaa.lambda-url.us-east-1.on.aws/";

const chatbox = document.getElementById("chatbox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const suggestionsContainer = document.getElementById("suggestions");

let sessionId = null;
let isWaiting = false;

// --- Helpers ---
function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerHTML = text.replace(/\n/g, "<br>");

  chatbox.appendChild(msg);
  // Scroll to the top of the latest message instead of the bottom
  msg.scrollIntoView({ behavior: "smooth", block: "start" });
}

function addCitations(citations) {
  if (!citations || citations.length === 0) return;

  console.log("Citations received:", citations);

  const citationContainer = document.createElement("div");
  citationContainer.className = "citations";
  citationContainer.innerHTML = `<strong>Referenced Documents:</strong>`;

  citations.forEach(cite => {
    if (!cite.url) return;

    const link = document.createElement("a");
    link.href = cite.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = cite.title || cite.url;

    link.style.display = "block";
    link.style.marginTop = "4px";
    link.style.color = "#2b63ff";
    link.style.textDecoration = "none";
    link.style.fontWeight = "500";
    link.addEventListener("mouseover", () => link.style.textDecoration = "underline");
    link.addEventListener("mouseout", () => link.style.textDecoration = "none");

    citationContainer.appendChild(link);
  });

  if (citationContainer.childElementCount > 1) {
    chatbox.appendChild(citationContainer);
    chatbox.scrollTop = chatbox.scrollHeight;
  }
}

// Typing indicator
function showTyping() {
  const typing = document.createElement("div");
  typing.className = "message bot typing";
  typing.textContent = "Bot is typing...";
  chatbox.appendChild(typing);
  chatbox.scrollTop = chatbox.scrollHeight;
  return typing;
}

// Show suggestion buttons
function showSuggestions(options) {
  suggestionsContainer.innerHTML = "";
  options.forEach(text => {
    const btn = document.createElement("button");
    btn.className = "suggestion-btn";
    btn.textContent = text;
    btn.addEventListener("click", () => {
      messageInput.value = text;
      sendMessage();
      suggestionsContainer.innerHTML = "";
    });
    suggestionsContainer.appendChild(btn);
  });
}



async function sendMessage() {
  if (isWaiting) return;

  const userMessage = messageInput.value.trim();
  if (!userMessage) return;

  // --- HANDLE META QUESTIONS LOCALLY ---
  const lower = userMessage.toLowerCase();
  if (
    lower.includes("what can you talk about") ||
    lower.includes("what do you do") ||
    lower.includes("what are you able to answer")
  ) {
    addMessage(
      "bot",
      "I can answer questions about hospital employee benefits, medical plans, FSAs, voluntary programs, eligibility rules, and enrollment details based on official hospital documentation."
    );
    messageInput.value = "";
    return; // Stop here — do NOT call Lambda
  }

  // --- NORMAL FLOW ---
  addMessage("user", userMessage);
  messageInput.value = "";

  isWaiting = true;
  sendBtn.disabled = true;

  const typingIndicator = showTyping();

  try {
    const response = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, session_id: sessionId })
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    typingIndicator.remove();

    if (!response.ok) {
      throw new Error("Server temporarily unavailable");
    }

    if (data.session_id) {
      sessionId = data.session_id;
    }

    if (data.error) {
      addMessage("bot", "⚠️ " + data.error);
      return;
    }

    addMessage(
      "bot",
      data.response || "I’m having trouble answering that right now."
    );

    if (data.citations) addCitations(data.citations);

    if (data.suggestions?.length) {
      showSuggestions(data.suggestions);
    }

  } catch (err) {
    typingIndicator.remove();
    addMessage("bot", "⚠️ Please try again in a moment.");
  } finally {
    setTimeout(() => {
      isWaiting = false;
      sendBtn.disabled = false;
    }, 400);
  }
}


// --- Event listeners ---
window.addEventListener("DOMContentLoaded", () => {
  

  document.querySelectorAll(".suggestion-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      messageInput.value = btn.textContent;
      sendMessage();
    });
  });
  
  const clearBtn = document.getElementById("clearBtn");
  clearBtn.addEventListener("click", () => {
    chatbox.innerHTML = "";
    suggestionsContainer.innerHTML = "";
    
    sessionId = null;
  });
});

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});


