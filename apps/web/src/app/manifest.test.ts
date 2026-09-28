import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("web app manifest", () => {
  it("keeps every same-origin route inside the installed app", () => {
    expect(manifest()).toMatchObject({
      id: "/month-end/app",
      start_url: "/month-end/app",
      scope: "/month-end/",
      display: "standalone",
    });
  });
});
