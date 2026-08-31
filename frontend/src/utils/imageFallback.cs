// Shared fallback for any product/order thumbnail whose image_data_url
// turns out to be invalid (a bare filename, a hotlink-protected external
// URL, or anything else that isn't a real displayable image). Instead of
// the browser's broken-image icon, we swap in a small inline SVG card
// with the product's initial — on-brand, and needs no network request.

const PALETTE = ["#B65C38", "#8A5A44", "#C97D3F", "#7A6248", "#A6714A"];

function colorFor(text) {
  const str = text || "?";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function placeholderDataUrl(title) {
  const initial = (title || "?").trim().charAt(0).toUpperCase() || "?";
  const bg = colorFor(title);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
      <rect width="100%" height="100%" fill="${bg}"/>
      <text x="50%" y="53%" font-family="'Georgia', serif" font-size="96"
            fill="rgba(255,255,255,0.85)" text-anchor="middle"
            dominant-baseline="middle">${initial}</text>
    </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Drop-in onError handler: <img onError={(e) => handleImgError(e, title)} />
export function handleImgError(e, title) {
  // Prevent an infinite loop if the placeholder itself somehow errors.
  e.target.onerror = null;
  e.target.src = placeholderDataUrl(title);
  e.target.classList.add("img-fallback");
}
