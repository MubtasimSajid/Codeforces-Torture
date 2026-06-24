async function getUserSolvedProblems(handle, maxSubmissions = 10000) {
  const solved = new Set();
  const url = "https://codeforces.com/api/user.status";
  let fromIdx = 1;

  while (solved.size <= maxSubmissions) {
    const params = new URLSearchParams({ handle, from: fromIdx });
    const resp = await fetch(`${url}?${params}`);
    const data = await resp.json();

    if (data.status !== "OK" || !data.result.length) break;

    for (const sub of data.result) {
      if (sub.verdict === "OK") {
        const prob = sub.problem;
        solved.add(`${prob.contestId}:${prob.index}`);
      }
    }
    fromIdx += data.result.length;
    await new Promise((r) => setTimeout(r, 600));
  }

  return solved;
}

async function getProblemsInRanges(minRating, maxRating) {
  const CACHE_KEY = "cf_problems_cache";
  const CACHE_TIME_KEY = "cf_torture_cache_timestamp";
  const ONE_MONTH = 31 * 24 * 60 * 60 * 1000;

  const stored = await chrome.storage.local.get([CACHE_KEY, CACHE_TIME_KEY]);
  const now = Date.now();

  let problemsList;

  if (
    stored[CACHE_KEY] &&
    stored[CACHE_TIME_KEY] &&
    now - stored[CACHE_TIME_KEY] <= ONE_MONTH
  ) {
    problemsList = stored[CACHE_KEY];
  } else {
    const resp = await fetch("https://codeforces.com/api/problemset.problems");
    const data = await resp.json();

    if (data.status !== "OK") return [];

    problemsList = data.result.problems;

    await chrome.storage.local.set({
      [CACHE_KEY]: problemsList,
      [CACHE_TIME_KEY]: now,
    });
  }

  return problemsList
    .filter((prob) => {
      const rating = prob.rating || 0;
      return rating >= minRating && rating <= maxRating;
    })
    .map((prob) => ({
      contestId: prob.contestId,
      index: prob.index,
      name: prob.name,
      rating: prob.rating || 0,
    }));
}

async function getRandomUnsolved(handle, minRating, maxRating) {
  const solved = await getUserSolvedProblems(handle);
  const candidates = [];

  for (const prob of await getProblemsInRanges(minRating, maxRating)) {
    const key = `${prob.contestId}:${prob.index}`;
    if (!solved.has(key)) {
      candidates.push({
        ...prob,
        link: `https://codeforces.com/problemset/problem/${prob.contestId}/${prob.index}`,
      });
    }
  }

  return candidates.length
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : null;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("dailyProblemFetch", {
    delayInMinutes: 1,
    periodInMinutes: 1440,
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "dailyProblemFetch") {
    const data = await chrome.storage.local.get(["handle", "minR", "maxR"]);

    if (data.handle) {
      try {
        const problem = await getRandomUnsolved(
          data.handle,
          data.minR || 800,
          data.maxR || 1200,
        );

        if (problem) {
          await chrome.storage.local.set({ todayProblem: problem });

          chrome.notifications.create("dailyProblemNotif", {
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/logo-48.png"),
            title: "Your daily Codeforces challenge",
            message: `Today: ${problem.name} [${problem.rating}]`,
          });
        }
      } catch (error) {
        console.error("Failed to fetch daily problem:", error);
      }
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.action === "FETCH_NEW") {
      const data = await chrome.storage.local.get(["handle", "minR", "maxR"]);
      if (!data.handle) {
        sendResponse({ error: "No handle" });
        return;
      }
      const newProblem = await getRandomUnsolved(
        data.handle,
        data.minR,
        data.maxR,
      );
      await chrome.storage.local.set({ todayProblem: newProblem });
      sendResponse({ problem: newProblem });
    }
    if (message.action === "CHECK_SOLVED_TODAY") {
      const data = await chrome.storage.local.get([
        "handle",
        "lastSolvedCheck",
        "solvedToday",
        "todayProblem",
      ]);
      if (!data.handle) {
        sendResponse({ solved: true });
        return;
      }
      if (data.lastSolvedCheck && data.solvedToday !== undefined) {
        if (Date.now() - data.lastSolvedCheck < 300000) {
          sendResponse({
            solved: data.solvedToday,
            problem: data.todayProblem || null,
          });
          return;
        }
      }
      try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const todayUnix = Math.floor(today.getTime() / 1000);
        const resp = await fetch(
          `https://codeforces.com/api/user.status?handle=${data.handle}&from=1&count=100`,
        );
        const result = await resp.json();
        const solved =
          result.status === "OK" &&
          result.result.some(
            (sub) =>
              sub.verdict === "OK" && sub.creationTimeSeconds >= todayUnix,
          );
        await chrome.storage.local.set({
          solvedToday: solved,
          lastSolvedCheck: Date.now(),
        });
        sendResponse({ solved, problem: data.todayProblem || null });
      } catch {
        sendResponse({ solved: true, problem: null });
      }
    }
    if (message.action === "CHECK_CF_LOGIN") {
      try {
        const resp = await fetch("https://codeforces.com/", {
          credentials: "include",
        });
        const html = await resp.text();
        const match = html.match(
          /<a[^>]*href="\/profile\/([^"]+)"[^>]*class="[^"]*rated-user[^"]*"[^>]*>/i,
        );
        if (match) {
          sendResponse({ loggedIn: true, handle: match[1] });
          return;
        }
        sendResponse({ loggedIn: false, handle: null });
      } catch {
        sendResponse({ loggedIn: false, handle: null });
      }
    }
  })();
  return true;
});
