function markActiveNavigation() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === current || (current === "" && href === "index.html")) {
      link.classList.add("active");
    }
  });
}

function setupCopyButtons() {
  document.querySelectorAll("[data-copy]").forEach((button) => {
    const originalLabel = button.textContent;

    button.addEventListener("click", async () => {
      const command = button.getAttribute("data-copy");
      try {
        await navigator.clipboard.writeText(command);
        button.textContent = "Copied";
      } catch (error) {
        button.textContent = command;
      }
      button.classList.add("copied");

      window.setTimeout(() => {
        button.textContent = originalLabel;
        button.classList.remove("copied");
      }, 1500);
    });
  });
}

function setupCodeCopy() {
  document.querySelectorAll(".code-block").forEach((block) => {
    const pre = block.querySelector("pre");
    const title = block.querySelector(".code-title");
    if (!pre || !title || title.querySelector("button")) return;

    const button = document.createElement("button");
    button.className = "copy-button";
    button.type = "button";
    button.textContent = "Copy";
    title.appendChild(button);

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent.trim());
        button.textContent = "Copied";
      } catch (error) {
        button.textContent = "Select";
      }
      button.classList.add("copied");
      window.setTimeout(() => {
        button.textContent = "Copy";
        button.classList.remove("copied");
      }, 1500);
    });
  });
}

function setupSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

markActiveNavigation();
setupCopyButtons();
setupCodeCopy();
setupSmoothAnchors();

if (window.hljs) {
  window.hljs.highlightAll();
}



