const setupView = document.getElementById("setup-view");
const problemView = document.getElementById("problem-view");

async function init() {
  const data = await browser.storage.local.get([
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

document.getElementById("save-btn").addEventListener("click", async () => {
  const settings = {
    handle: document.getElementById("handle").value,
    minR: parseInt(document.getElementById("minR").value),
    maxR: parseInt(document.getElementById("maxR").value),
  };
  await browser.storage.local.set(settings);
  requestNewProblem();
});

async function requestNewProblem() {
  if (response && response.problem) {
    showProblem(response.problem);
  }
}

init();
