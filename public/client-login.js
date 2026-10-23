/*
 * Quiet "Client Login" link for the bottom-right corner of any website
 * (gottsmerch.com or others).
 * Add this one line before </body>, using the portal's own address:
 *
 *   <script src="https://portal.gottsmerch.com/client-login.js" defer></script>
 *
 * Optional attributes on the script tag:
 *   data-label="Client Login"   link text
 *   data-color="#091e3f"        text and border color
 */
(function () {
  var script = document.currentScript;
  if (!script || document.getElementById("cj-client-login")) return;
  var origin = new URL(script.src, window.location.href).origin;
  var label = script.getAttribute("data-label") || "Client Login";
  var color = script.getAttribute("data-color") || "#091e3f";

  var style = document.createElement("style");
  style.textContent =
    "#cj-client-login{position:fixed;right:calc(18px + env(safe-area-inset-right,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:2147483000;" +
    "display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border:1px solid rgba(9,30,63,.18);border-radius:999px;" +
    "background:rgba(255,255,255,.82);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);color:" + color + ";" +
    "font:700 13px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:.01em;text-decoration:none;opacity:.72;" +
    "transition:opacity .2s ease,border-color .2s ease}" +
    "#cj-client-login:hover,#cj-client-login:focus-visible{opacity:1;border-color:" + color + "}" +
    "#cj-client-login:focus-visible{outline:2px solid " + color + ";outline-offset:3px}" +
    "#cj-client-login svg{width:13px;height:13px;flex:none}" +
    "@media (prefers-reduced-motion:reduce){#cj-client-login{transition:none}}" +
    "@media print{#cj-client-login{display:none}}";
  document.head.appendChild(style);

  var link = document.createElement("a");
  link.id = "cj-client-login";
  link.href = origin + "/portal/login";
  link.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  link.appendChild(document.createTextNode(label));
  function mount() { document.body.appendChild(link); }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
