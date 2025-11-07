
import { readFileSync } from "fs";

const filePath = process.argv[2];
if (!filePath) {
    console.error("Usage: ts-node ./run.ts <source-file>");
    process.exit(1);
}
import { run } from "./src";

const src = readFileSync(filePath, "utf8");
const result = run(src);
console.log(result);