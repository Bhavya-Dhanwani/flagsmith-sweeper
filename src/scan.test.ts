import assert from "node:assert";
import { scanSource } from "./scan.js";

const u = scanSource(`a\nflags.isEnabled("x")\nflags.getValue('y.z')\nfoo("nope")`);
assert.deepStrictEqual(u.map((x) => [x.flag, x.line]), [["x", 2], ["y.z", 3]]);
console.log("scan ok");
