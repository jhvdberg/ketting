/**
 * Kleine, framework-vrije SVG-lijngrafiek (briefing 6.24). Horizontaal
 * scrollbaar wanneer de historie breder is dan het scherm; elk punt heeft
 * een native tooltip (title) als eenvoudige interactieve verkenning.
 */
import { el } from "../../core/ui/dom.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export function renderLineChart(points) {
  const height = 200;
  const pointGap = 48;
  const paddingLeft = 12;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 28;
  const width = Math.max(320, paddingLeft + paddingRight + (points.length - 1) * pointGap);

  const values = points.map((p) => p.y);
  const maxY = Math.max(...values, 0);
  const minY = Math.min(...values, 0);
  const range = maxY - minY || 1;

  const xFor = (i) => paddingLeft + i * pointGap;
  const yFor = (v) => paddingTop + (1 - (v - minY) / range) * (height - paddingTop - paddingBottom);

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.style.display = "block";

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.y)}`).join(" ");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", pathD);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "var(--amber)");
  path.setAttribute("stroke-width", "2");
  svg.appendChild(path);

  points.forEach((p, i) => {
    const cx = xFor(i);
    const cy = yFor(p.y);
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", p.missing ? "2.5" : "4");
    circle.setAttribute("fill", p.missing ? "var(--muted)" : "var(--amber)");
    const title = document.createElementNS(SVG_NS, "title");
    title.textContent = `${p.x}: ${p.y}${p.missing ? " (geen training, doorgetrokken)" : ""}`;
    circle.appendChild(title);
    svg.appendChild(circle);

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", String(cx));
    label.setAttribute("y", String(height - 8));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "9");
    label.setAttribute("fill", "var(--muted)");
    label.textContent = p.x.slice(5);
    svg.appendChild(label);
  });

  const wrap = el("div", { style: "overflow-x:auto; -webkit-overflow-scrolling:touch; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:8px;" });
  wrap.appendChild(svg);
  return wrap;
}
