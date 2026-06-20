import assert from "node:assert/strict";
import { getRequestOrigin } from "./request-origin";

const request = new Request("https://honghong-app.vercel.app/api/chat");

assert.equal(getRequestOrigin(request), "https://honghong-app.vercel.app");
assert.equal(
  getRequestOrigin(request, "https://example.com"),
  "https://honghong-app.vercel.app"
);
