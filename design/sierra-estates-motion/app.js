const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelector(".ticker-track").innerHTML += document.querySelector(".ticker-track").innerHTML;

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
);
document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      const target = Number(element.dataset.counter);
      const start = performance.now();
      const duration = 1300;
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      counterObserver.unobserve(element);
    });
  },
  { threshold: 0.6 }
);
document.querySelectorAll("[data-counter]").forEach((element) => counterObserver.observe(element));

const cursor = document.querySelector(".cursor-dot");
if (!prefersReducedMotion && matchMedia("(pointer: fine)").matches) {
  window.addEventListener("pointermove", (event) => {
    cursor.style.opacity = "1";
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  });
  document.querySelectorAll("a, button, .tilt-card").forEach((element) => {
    element.addEventListener("pointerenter", () => cursor.classList.add("active"));
    element.addEventListener("pointerleave", () => cursor.classList.remove("active"));
  });
}

if (!prefersReducedMotion) {
  document.querySelectorAll(".tilt-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      document.documentElement.style.setProperty("--scroll", y);
      const heroImage = document.querySelector(".hero-bg img");
      if (heroImage) heroImage.style.translate = `0 ${y * 0.07}px`;
    },
    { passive: true }
  );
}

const modal = document.querySelector("[data-modal]");
document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    if (typeof modal.showModal === "function") modal.showModal();
  });
});

const chatPanel = document.querySelector("[data-chat-panel]");
const chatLog = document.querySelector("[data-chat-log]");
const chatForm = document.querySelector("[data-chat-form]");
const responses = {
  roi: "Top ROI signals today: Uptown Cairo +31%, Mountain View iCity +24%, Hyde Park +22%. I would shortlist Uptown for appreciation and Mivida for rental depth.",
  hyde: "Hyde Park: villas from EGP 22M, AI score 9.8, three below-trend units flagged today, strongest family-villa signal.",
  mivida: "Mivida rentals: 2-bed units from EGP 5.2M, average furnished rent near $1,700/mo, strong expat demand.",
  rent: "Best rental plays: Mivida for premium tenants, Al Rehab for yield stability, Madinaty for lower entry price.",
  budget: "Send budget, bedrooms, and preferred compound. Sierra AI can narrow the list to the strongest 3 options.",
  default: "I can compare compounds, budget, rent, ROI, and current availability. Try asking about Hyde Park, Mivida, or best ROI."
};

function appendMessage(text, type) {
  const message = document.createElement("p");
  message.className = type;
  message.textContent = text;
  chatLog.append(message);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function answerFor(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes("hyde")) return responses.hyde;
  if (normalized.includes("mivida")) return responses.mivida;
  if (normalized.includes("roi") || normalized.includes("invest")) return responses.roi;
  if (normalized.includes("rent")) return responses.rent;
  if (normalized.includes("budget")) return responses.budget;
  return responses.default;
}

function sendChat(text) {
  const clean = text.trim();
  if (!clean) return;
  appendMessage(clean, "user");
  setTimeout(() => appendMessage(answerFor(clean), "ai"), 420);
}

document.querySelector("[data-chat-toggle]").addEventListener("click", () => chatPanel.classList.toggle("open"));
document.querySelector("[data-chat-close]").addEventListener("click", () => chatPanel.classList.remove("open"));
document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => sendChat(button.dataset.prompt));
});
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = chatForm.elements.message;
  sendChat(input.value);
  input.value = "";
});
