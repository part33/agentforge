import assert from "node:assert/strict";
import test from "node:test";

import { createTaskBoard, renderBoard, sampleTasks } from "../src/task-board.js";
import { createTask, filterTasks, groupTasksByStatus } from "../src/tasks.js";

test("createTask validates required fields and status", () => {
  assert.throws(() => createTask({ title: "Missing id" }), /Task id is required/);
  assert.throws(() => createTask({ id: "bad", title: "Bad", status: "blocked" }), /Unsupported task status/);
  assert.equal(createTask({ id: "ok", title: "Ok" }).status, "todo");
});

test("groupTasksByStatus creates predictable board columns", () => {
  const board = groupTasksByStatus(sampleTasks);

  assert.equal(board.done.length, 1);
  assert.equal(board.doing.length, 1);
  assert.equal(board.todo.length, 1);
});

test("filterTasks supports status, assignee, and tag filters", () => {
  assert.equal(filterTasks(sampleTasks, { status: "done" }).length, 1);
  assert.equal(filterTasks(sampleTasks, { assignee: "Ada" }).length, 2);
  assert.equal(filterTasks(sampleTasks, { tag: "ux" }).length, 1);
});

test("createTaskBoard returns filtered columns", () => {
  const board = createTaskBoard(sampleTasks, { assignee: "Ada" });

  assert.equal(board.total, 2);
  assert.equal(board.columns.doing.length, 0);
});

test("renderBoard prints all columns", () => {
  const output = renderBoard(createTaskBoard());

  assert.match(output, /TODO:/);
  assert.match(output, /DOING:/);
  assert.match(output, /DONE:/);
});
