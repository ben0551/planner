const COLORS = [
  "#f59e0b", "#10b981", "#6366f1", "#ec4899",
  "#3b82f6", "#ef4444", "#84cc16", "#f97316",
  "#a855f7", "#06b6d4",
];

export function celebrate(points?: number) {
  if (typeof window === "undefined") return;

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.44;

  for (let i = 0; i < 55; i++) {
    const el = document.createElement("div");
    const size = 7 + Math.random() * 10;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const isRect = Math.random() > 0.45;
    el.style.cssText = [
      "position:fixed",
      `left:${cx + (Math.random() - 0.5) * 100}px`,
      `top:${cy}px`,
      `width:${size}px`,
      `height:${isRect ? size * 0.45 : size}px`,
      `border-radius:${isRect ? "2px" : "50%"}`,
      `background:${color}`,
      "pointer-events:none",
      "z-index:9999",
    ].join(";");
    document.body.appendChild(el);

    const tx = (Math.random() - 0.5) * 420;
    const ty = -(100 + Math.random() * 280);
    const rot = (Math.random() - 0.5) * 1080;
    const dur = 900 + Math.random() * 700;
    const delay = Math.random() * 180;

    el
      .animate(
        [
          { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
          { transform: `translate(${tx}px,${ty}px) rotate(${rot}deg)`, opacity: 0 },
        ],
        {
          duration: dur,
          delay,
          easing: "cubic-bezier(0.25,0.46,0.45,0.94)",
          fill: "forwards",
        }
      )
      .finished.then(() => el.remove());
  }

  if (points !== undefined && points > 0) {
    const el = document.createElement("div");
    el.textContent = `+${points} pts!`;
    el.style.cssText = [
      "position:fixed",
      `left:${cx}px`,
      `top:${cy - 30}px`,
      "transform:translateX(-50%)",
      "font-weight:900",
      "font-size:2.25rem",
      "color:#f59e0b",
      "z-index:9999",
      "pointer-events:none",
      "text-shadow:0 2px 14px rgba(0,0,0,0.25)",
      "white-space:nowrap",
      "font-family:system-ui,sans-serif",
    ].join(";");
    document.body.appendChild(el);
    el
      .animate(
        [
          { transform: "translateX(-50%) translateY(0) scale(0.4)", opacity: 0 },
          { transform: "translateX(-50%) translateY(-24px) scale(1.35)", opacity: 1, offset: 0.28 },
          { transform: "translateX(-50%) translateY(-55px) scale(1.05)", opacity: 1, offset: 0.6 },
          { transform: "translateX(-50%) translateY(-95px) scale(0.9)", opacity: 0 },
        ],
        { duration: 1700, easing: "ease-out", fill: "forwards" }
      )
      .finished.then(() => el.remove());
  }
}
