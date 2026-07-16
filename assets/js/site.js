(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function markActiveNavigation() {
    const currentPath = window.location.pathname.replace(/\/+$/, "");
    const current = currentPath.split("/").pop() || "index.html";

    document.querySelectorAll(".nav-links a").forEach((link) => {
      const url = new URL(link.href, window.location.href);
      const targetPath = url.pathname.replace(/\/+$/, "");
      const target = targetPath.split("/").pop() || "index.html";
      const active = target === current;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
    });
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("Copy is unavailable.");
  }

  function showCopyState(button, label, originalLabel) {
    button.textContent = label;
    button.classList.add("copied");
    window.setTimeout(() => {
      button.textContent = originalLabel;
      button.classList.remove("copied");
    }, 1500);
  }

  function setupCopyButtons() {
    document.querySelectorAll("[data-copy]").forEach((button) => {
      const originalLabel = button.textContent.trim() || "Copy";
      button.addEventListener("click", async () => {
        try {
          await copyText(button.getAttribute("data-copy") || "");
          showCopyState(button, "Copied", originalLabel);
        } catch (error) {
          showCopyState(button, "Select text", originalLabel);
        }
      });
    });
  }

  function setupCodeCopy() {
    document.querySelectorAll(".code-block").forEach((block) => {
      const pre = block.querySelector("pre");
      const title = block.querySelector(".code-title");
      if (!pre || !title || title.querySelector(".copy-button")) return;

      const button = document.createElement("button");
      button.className = "copy-button";
      button.type = "button";
      button.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code");
      title.appendChild(button);

      button.addEventListener("click", async () => {
        try {
          await copyText(pre.textContent.trim());
          showCopyState(button, "Copied", "Copy");
        } catch (error) {
          showCopyState(button, "Select text", "Copy");
        }
      });
    });
  }

  function setupSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href || href === "#") return;

        let target;
        try {
          target = document.querySelector(href);
        } catch (error) {
          return;
        }
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({
          behavior: reducedMotion.matches ? "auto" : "smooth",
          block: "start",
        });
        history.pushState(null, "", href);
      });
    });
  }

  function setupHeaderState() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const update = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function setupMobileNavigation() {
    const header = document.querySelector(".site-header");
    const navigation = header?.querySelector(".nav-links");
    if (!header || !navigation || header.querySelector(".nav-toggle")) return;

    const button = document.createElement("button");
    button.className = "nav-toggle";
    button.type = "button";
    button.title = "Open navigation";
    button.setAttribute("aria-label", "Open navigation");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = '<span></span><span></span><span></span>';
    header.insertBefore(button, navigation);

    const closeMenu = () => {
      header.classList.remove("nav-open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open navigation");
      button.title = "Open navigation";
    };

    button.addEventListener("click", () => {
      const open = !header.classList.contains("nav-open");
      header.classList.toggle("nav-open", open);
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      button.title = open ? "Close navigation" : "Open navigation";
    });
    navigation.addEventListener("click", closeMenu);
    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  function setupRevealAnimations() {
    const selectors = [
      ".page-hero > *",
      ".section-heading",
      ".feature-card",
      ".path-card",
      ".example-card",
      ".card",
      ".code-block",
      ".file-tree",
      ".timeline article",
      ".callout",
      ".split > *",
      ".command-grid > *",
    ];
    const elements = [...document.querySelectorAll(selectors.join(","))];

    elements.forEach((element, index) => {
      element.dataset.reveal = "";
      element.style.setProperty("--reveal-delay", `${(index % 4) * 70}ms`);
    });

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    elements.forEach((element) => observer.observe(element));
  }

  function setupCardMotion() {
    if (reducedMotion.matches || window.matchMedia("(pointer: coarse)").matches) return;

    document.querySelectorAll(".feature-card, .path-card, .example-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        card.style.setProperty("--card-rotate-x", `${y * -2.5}deg`);
        card.style.setProperty("--card-rotate-y", `${x * 2.5}deg`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.removeProperty("--card-rotate-x");
        card.style.removeProperty("--card-rotate-y");
      });
    });
  }

  // Website-only document windows. The IDE is a separate Vue application and
  // intentionally does not load WinBox.js.
  function ensureBookNavigation() {
    document.querySelectorAll(".nav-links").forEach((navigation) => {
      if ([...navigation.querySelectorAll("a")].some((link) => link.getAttribute("href") === "book.html")) return;
      const link = document.createElement("a");
      link.href = "book.html";
      link.textContent = "Book";
      const packages = [...navigation.querySelectorAll("a")].find((item) => item.getAttribute("href") === "packages.html");
      navigation.insertBefore(link, packages || null);
    });
  }

  function setupWinBoxLinks() {
    document.querySelectorAll("[data-winbox]").forEach((link) => {
      if (link.dataset.winboxReady) return;
      link.dataset.winboxReady = "true";
      link.addEventListener("click", (event) => {
        if (!window.WinBox) return;
        event.preventDefault();
        const url = link.getAttribute("data-winbox") || link.getAttribute("href");
        if (!url) return;
        new window.WinBox({
          title: link.textContent.trim() || "NovaDev document",
          url,
          width: "min(1100px, 88vw)",
          height: "min(780px, 82vh)",
          x: "center",
          y: "center",
          class: ["wb-novadev"],
        });
      });
    });
  }

  function loadWinBox() {
    ensureBookNavigation();
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/winbox@0.2.82/dist/css/winbox.min.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/winbox@0.2.82/dist/winbox.bundle.min.js";
    script.onload = setupWinBoxLinks;
    script.onerror = () => { /* The normal link remains usable if the CDN is unavailable. */ };
    document.head.appendChild(script);
  }

  function initialize() {
    document.documentElement.classList.add("js-ready");
    markActiveNavigation();
    setupCopyButtons();
    setupCodeCopy();
    setupSmoothAnchors();
    setupHeaderState();
    setupMobileNavigation();
    setupRevealAnimations();
    setupCardMotion();
    loadWinBox();
    if (window.hljs) window.hljs.highlightAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
