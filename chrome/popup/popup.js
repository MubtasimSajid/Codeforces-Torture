const setupView = document.getElementById("setup-view");
const problemView = document.getElementById("problem-view");
const loginText = document.getElementById("login-text");
const loginBtn = document.getElementById("login-btn");

async function checkCFLogin() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "CHECK_CF_LOGIN",
    });
    if (response && response.loggedIn && response.handle) {
      loginText.textContent = `Logged in as ${response.handle}`;
      loginText.style.color = "#38a169";
      loginBtn.classList.add("hidden");
      document.getElementById("handle").value = response.handle;
      return response.handle;
    } else if (response && response.loggedIn) {
      loginText.textContent =
        "Logged in, but can't detect handle. Enter manually.";
      loginText.style.color = "#d69e2e";
      loginBtn.classList.add("hidden");
    } else {
      loginText.textContent = "Not logged into Codeforces";
      loginText.style.color = "#e53e3e";
      loginBtn.classList.remove("hidden");
    }
  } catch {
    loginText.textContent = "Could not check login status";
    loginBtn.classList.remove("hidden");
  }
  return null;
}

async function validateHandle(handle) {
  try {
    const resp = await fetch(
      `https://codeforces.com/api/user.info?handles=${handle}`,
    );
    const data = await resp.json();
    return data.status === "OK";
  } catch {}
}

async function init() {
  const handle = await checkCFLogin();
  const data = await chrome.storage.local.get([
    "handle",
    "minR",
    "maxR",
    "todayProblem",
  ]);

  if (data.handle) {
    document.getElementById("handle").value = data.handle;
    document.getElementById("minR").value = data.minR || 800;
    document.getElementById("maxR").value = data.maxR || 1200;

    if (data.todayProblem) {
      showProblem(data.todayProblem);
    }
  }
}

function showProblem(prob) {
  problemView.classList.remove("hidden");
  document.getElementById("prob-name").textContent = prob.name;
  document.getElementById("prob-rating").textContent = prob.rating;
  document.getElementById("prob-link").href = prob.link;
}

loginBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://codeforces.com/enter" });
});

document.getElementById("save-btn").addEventListener("click", async () => {
  const handle = document.getElementById("handle").value.trim();
  if (!handle) return;

  const valid = await validateHandle(handle);
  if (!valid) {
    loginText.textContent = "Handle not found on Codeforces";
    loginText.style.color = "#e53e3e";
    return;
  }

  let minR = document.getElementById("minR").value || 800;
  minR = minR - (minR % 100);
  if (minR < 800) minR = 800;
  document.getElementById("minR").value = minR;

  let maxR = document.getElementById("maxR").value || 1200;
  maxR = maxR - (maxR % 100);
  if (maxR > 3100) maxR = 3100;
  if (minR > maxR) [minR, maxR] = [maxR, minR];
  document.getElementById("minR").value = minR;
  document.getElementById("maxR").value = maxR;

  const settings = {
    handle,
    minR,
    maxR,
  };
  await chrome.storage.local.set(settings);
  requestNewProblem();
});

async function requestNewProblem() {
  let response = await chrome.runtime.sendMessage({
    action: "FETCH_NEW",
  });
  if (response && response.problem) {
    showProblem(response.problem);
  }
}

init();
