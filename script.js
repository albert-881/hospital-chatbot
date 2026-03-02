// Replace with your Lambda Function URL
const LAMBDA_URL = "https://744omkgp7soasyumfsxlx6cixq0bzvaa.lambda-url.us-east-1.on.aws/";

const chatbox = document.getElementById("chatbox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const suggestionsContainer = document.getElementById("suggestions");

let sessionId = null;
let isWaiting = false;

// --- Helpers ---
function addMessage(sender, text = "") {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerHTML = text.replace(/\n/g, "<br>");
  chatbox.appendChild(msg);
  chatbox.scrollTop = chatbox.scrollHeight;
  return msg;
}

function addCitations(citations) {
  if (!citations || citations.length === 0) return null;

  const container = document.createElement("div");
  container.className = "citations";
  container.innerHTML = "<strong>Referenced Documents:</strong>";

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
    container.appendChild(link);
  });

  if (container.childElementCount > 1) chatbox.appendChild(container);
  return container;
}

function showTyping() {
  const typing = addMessage("bot", "Bot is typing...");
  typing.classList.add("typing");
  return typing;
}

// --- Suggestion buttons ---
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

// --- Send message ---
async function sendMessage() {
  if (isWaiting) return;

  const userMessage = messageInput.value.trim();
  if (!userMessage) return;

  // Handle meta questions locally
  const lower = userMessage.toLowerCase();
  if (
    lower.includes("what can you talk about") ||
    lower.includes("what do you do") ||
    lower.includes("what are you able to answer")
  ) {
    addMessage("bot", "I can answer questions about hospital employee benefits, medical plans, FSAs, voluntary programs, eligibility rules, and enrollment details based on official hospital documentation.");
    messageInput.value = "";
    return;
  }

  addMessage("user", userMessage);
  messageInput.value = "";

  isWaiting = true;
  sendBtn.disabled = true;

  const typingIndicator = showTyping();

  try {
    const response = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, session_id: sessionId, stream: true }) // tell Lambda we want streaming
    });

    if (!response.ok) throw new Error("Server temporarily unavailable");

    // --- Streaming reader ---
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let botMsg = addMessage("bot", "");
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        botMsg.innerHTML += decoder.decode(value);
        chatbox.scrollTop = chatbox.scrollHeight;
      }
    }

    typingIndicator.remove();

    // Try to get the final JSON if Lambda sends citations or session_id
    try {
      const finalData = await response.json();
      if (finalData.session_id) sessionId = finalData.session_id;
      if (finalData.citations) addCitations(finalData.citations);
      if (finalData.suggestions?.length) showSuggestions(finalData.suggestions);
    } catch { /* ignore if streaming text only */ }

  } catch (err) {
    typingIndicator.remove();
    addMessage("bot", "⚠️ Please try again in a moment.");
  } finally {
    isWaiting = false;
    sendBtn.disabled = false;
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

  document.getElementById("clearBtn")?.addEventListener("click", () => {
    chatbox.innerHTML = "";
    suggestionsContainer.innerHTML = "";
    sessionId = null;
  });
});

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});