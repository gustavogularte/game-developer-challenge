import { test, expect, type Page } from "@playwright/test";
const record = {
  id: "e2e-battle-1",
  playerId: "local-captain",
  playerName: "Captain Jack",
  completedAt: "2026-10-15T03:00:00.000Z",
  score: 24,
  playedSeconds: 120,
  reason: "timeUp",
  settings: { durationSeconds: 120, spawnIntervalSeconds: 3 },
  rulesVersion: "pirate-battle-v2",
};
async function openGame(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.getByText("Loading the sea…")).toBeHidden();
}
test("options limits, saving and refresh", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "OPTIONS", exact: true }).click();
  await page
    .getByRole("button", { name: "Increase Game session time" })
    .click();
  await expect(
    page.getByRole("button", { name: "Increase Game session time" }),
  ).toBeDisabled();
  for (let i = 0; i < 2; i++)
    await page
      .getByRole("button", { name: "Decrease Enemy spawn time" })
      .click();
  await expect(
    page.getByRole("button", { name: "Decrease Enemy spawn time" }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "OPTIONS", exact: true }).click();
  await expect(page.locator("output").first()).toHaveText("180 s");
  await expect(page.locator("output").last()).toHaveText("1 s");
});
test("pause freezes time, settings preserve active snapshot, blur needs explicit resume", async ({
  page,
}) => {
  await openGame(page);
  await page.getByRole("button", { name: "Pause game" }).click();
  await expect(
    page.getByRole("heading", { name: "PAUSE", exact: true }),
  ).toBeVisible();
  const before = await page.locator(".game-hud__counter").last().innerText();
  await page.waitForTimeout(1300);
  expect(await page.locator(".game-hud__counter").last().innerText()).toBe(
    before,
  );
  await page.getByRole("button", { name: "OPTIONS", exact: true }).click();
  await page
    .getByRole("button", { name: "Decrease Game session time" })
    .click();
  await page.getByRole("button", { name: "BACK TO PAUSE" }).click();
  await page.getByRole("button", { name: "RESUME", exact: true }).click();
  await page.waitForTimeout(200);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(
    page.getByRole("heading", { name: "PAUSE", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "MAIN MENU", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("pirate-battle:confirmed:v2"),
    ),
  ).toBeNull();
});
test("ranking is paginated; history contains only own completed battles", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "RANKING", exact: true }).click();
  await expect(page.getByText("Captain Flint", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("PAGE 2 OF 3")).toBeVisible();
  await page
    .getByRole("button", { name: "MATCH HISTORY", exact: true })
    .click();
  await expect(page.getByText("No battles yet.")).toBeVisible();
  await page.evaluate(async (data) => {
    await fetch("/api/matches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": data.id,
      },
      body: JSON.stringify(data),
    });
  }, record);
  await page.getByRole("button", { name: "RANKING", exact: true }).click();
  await page
    .getByRole("button", { name: "MATCH HISTORY", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "24", exact: true }),
  ).toBeVisible();
});
test("pending registration survives refresh and timeout after commit never duplicates", async ({
  page,
}) => {
  await page.addInitScript((data) => {
    if (!localStorage.getItem("seeded")) {
      localStorage.setItem("seeded", "true");
      localStorage.setItem("pirate-battle:pending:v2", JSON.stringify([data]));
      localStorage.setItem(
        "pirate-battle:scenario:v2",
        JSON.stringify("timeoutAfterCommit"),
      );
    }
  }, record);
  await page.goto("/");
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("pirate-battle:pending:v2") ?? "[]")
              .length,
        ),
      { timeout: 15000 },
    )
    .toBe(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("pirate-battle:confirmed:v2") ?? "[]")
          .length,
    ),
  ).toBe(1);
  await page.reload();
  await page
    .getByRole("button", { name: "MATCH HISTORY", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "24", exact: true }),
  ).toBeVisible();
});
test("refresh opens the menu while preserving the last result and confirmed history", async ({
  page,
}) => {
  await page.addInitScript((data) => {
    localStorage.setItem("pirate-battle:last-result:v2", JSON.stringify(data));
    localStorage.setItem("pirate-battle:confirmed:v2", JSON.stringify([data]));
  }, record);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "PLAY", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("pirate-battle:last-result:v2") ?? "null",
        ).id,
    ),
  ).toBe(record.id);
  await page
    .getByRole("button", { name: "MATCH HISTORY", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "24", exact: true }),
  ).toBeVisible();
});
test("network failure does not prevent returning to Play", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "RANKING", exact: true }).click();
  await page.getByText("Network demo", { exact: true }).click();
  await page.getByRole("combobox").selectOption("rankingError");
  await expect(
    page.getByText("Could not load battles. You can still play."),
  ).toBeVisible();
  await page.getByRole("button", { name: "MAIN MENU", exact: true }).click();
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
});

test("registration drains a new queued battle while an earlier request is in flight", async ({
  page,
}) => {
  await page.addInitScript((data) => {
    localStorage.setItem("pirate-battle:pending:v2", JSON.stringify([data]));
    localStorage.setItem("pirate-battle:scenario:v2", JSON.stringify("slow"));
  }, record);
  const firstRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/matches") && request.method() === "POST",
  );
  await page.goto("/");
  await firstRequest;
  await page.evaluate(
    (data) =>
      localStorage.setItem(
        "pirate-battle:pending:v2",
        JSON.stringify([data, { ...data, id: "e2e-battle-2" }]),
      ),
    record,
  );
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("pirate-battle:pending:v2") ?? "[]")
              .length,
        ),
      { timeout: 15000 },
    )
    .toBe(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("pirate-battle:confirmed:v2") ?? "[]")
          .length,
    ),
  ).toBe(2);
});
