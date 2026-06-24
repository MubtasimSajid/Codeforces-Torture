(async () => {
  if (window.location.href.includes("codeforces.com")) return;

  let response;
  try {
    response = await chrome.runtime.sendMessage({
      action: "CHECK_SOLVED_TODAY",
    });
  } catch {
    return;
  }

  if (!response || response.solved) return;

  const problem = response.problem;
  const link = problem ? problem.link : "https://codeforces.com/problemset";
  const name = problem ? problem.name : "Today's Codeforces Problem";
  const rating = problem && problem.rating ? ` (${problem.rating})` : "";
  const overlay = document.createElement("div");
  overlay.id = "cf-torture-overlay";
  overlay.style.cssText =
    "position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:sans-serif;";

  const card = document.createElement("div");
  card.style.cssText =
    "background:#fff;color:#333;padding:16px;border:2px solid #ccc;border-radius:5px;max-width:360px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.2);";
  card.innerHTML = `
    <h2 style="margin:0 0 12px;color:#0f7feded;font-size:20px;">Solve a Codeforces problem first!</h2>
    <p style="margin:0 0 8px;font-size:14px;color:#555;">Your daily challenge:</p>
    <p style="font-size:16px;font-weight:bold;margin:16px 0;color:#333;">${name}${rating}</p>
    <a href="${link}" style="display:inline-block;background:#3182ce;color:white;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:14px;margin-top:4px;">Solve on Codeforces</a>
    <p style="margin-top:12px;font-size:12px;color:#999;">Redirecting shortly...</p>
  `;

  overlay.appendChild(card);
  document.documentElement.appendChild(overlay);
  setTimeout(() => {
    window.location.replace(link);
  }, 2000);
})();
