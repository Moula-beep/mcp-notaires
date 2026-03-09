(function () {
  function createEl(tag, attrs, text) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    }
    if (text) {
      el.textContent = text;
    }
    return el;
  }

  function appendMessage(container, role, message) {
    const line = createEl("div");
    line.style.margin = "0.4rem 0";
    line.style.whiteSpace = "pre-wrap";
    line.innerHTML = `<strong>${role === "user" ? "Vous" : "Elie"}:</strong> ${message}`;
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
  }

  async function sendQuestion(endpoint, sessionId, question) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, question })
    });
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    return response.json();
  }

  function init(options) {
    const endpoint = options?.endpoint || "/api/chat";
    const title = options?.title || "Bot";
    const sessionId = Math.random().toString(36).slice(2);

    const wrapper = createEl("div");
    wrapper.style.position = "fixed";
    wrapper.style.bottom = "16px";
    wrapper.style.right = "16px";
    wrapper.style.width = "360px";
    wrapper.style.background = "#fff";
    wrapper.style.border = "1px solid #ddd";
    wrapper.style.borderRadius = "10px";
    wrapper.style.boxShadow = "0 4px 18px rgba(0,0,0,0.12)";
    wrapper.style.overflow = "hidden";
    wrapper.style.zIndex = "99999";

    const header = createEl("div", null, title);
    header.style.background = "#111827";
    header.style.color = "#fff";
    header.style.padding = "10px 12px";
    header.style.fontWeight = "bold";

    const messages = createEl("div");
    messages.style.height = "260px";
    messages.style.overflowY = "auto";
    messages.style.padding = "10px";
    messages.style.fontSize = "14px";

    const footer = createEl("div");
    footer.style.display = "flex";
    footer.style.gap = "8px";
    footer.style.padding = "10px";
    footer.style.borderTop = "1px solid #eee";

    const input = createEl("input", { type: "text", placeholder: "Posez votre question..." });
    input.style.flex = "1";
    input.style.padding = "8px";

    const sendBtn = createEl("button", null, "Envoyer");
    sendBtn.style.padding = "8px 12px";
    sendBtn.style.cursor = "pointer";

    appendMessage(messages, "bot", "Bonjour, je peux vous aider pour le prix de carte grise et les questions generales.");

    async function onSend() {
      const question = input.value.trim();
      if (!question) {
        return;
      }
      input.value = "";
      appendMessage(messages, "user", question);
      appendMessage(messages, "bot", "...");
      const waitingLine = messages.lastChild;

      try {
        const data = await sendQuestion(endpoint, sessionId, question);
        const links = (data.sources || [])
          .map((s) => `${s.label}: ${s.url}`)
          .join("\n");
        const disclaimers = (data.disclaimers || []).join("\n- ");
        waitingLine.innerHTML =
          `<strong>Elie:</strong> ${data.answer}` +
          (links ? `\n\nSources:\n${links}` : "") +
          (disclaimers ? `\n\nNotes:\n- ${disclaimers}` : "");
      } catch (err) {
        waitingLine.innerHTML = "<strong>Elie:</strong> Erreur technique, merci de reessayer.";
      }
    }

    sendBtn.addEventListener("click", onSend);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        onSend();
      }
    });

    footer.appendChild(input);
    footer.appendChild(sendBtn);
    wrapper.appendChild(header);
    wrapper.appendChild(messages);
    wrapper.appendChild(footer);
    document.body.appendChild(wrapper);
  }

  window.CarteGriseBot = { init };
})();
