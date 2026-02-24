const test = require("node:test");
const assert = require("node:assert/strict");

const { app } = require("../src/server");

let server;
let baseUrl;

test.before(() => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
});

test("returns 401 when userId does not match authenticated user", async () => {
  const response = await fetch(`${baseUrl}/users/user-1/access-check`, {
    headers: {
      "x-user-id": "user-2"
    }
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error, "Unauthorized");
});

test("returns 200 when userId matches authenticated user", async () => {
  const response = await fetch(`${baseUrl}/users/user-1/access-check`, {
    headers: {
      "x-user-id": "user-1"
    }
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
});
