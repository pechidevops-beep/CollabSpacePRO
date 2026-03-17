import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import { readConfig, scanFiles, readStaged, writeStaged } from "../utils.js";

export function addCmd(paths) {
    readConfig(); // verify initialized

    const cwd = process.cwd();
    let filesToAdd = [];

    const targets = paths.length === 0 ? ["."] : paths;

    for (const p of targets) {
        if (p === ".") {
            filesToAdd = scanFiles(cwd);
            break;
        } else {
            const abs = path.resolve(cwd, p);
            const stat = fs.statSync(abs);
            if (stat.isDirectory()) {
                const rel = path.relative(cwd, abs).replace(/\\/g, "/");
                filesToAdd.push(...scanFiles(abs, rel));
            } else {
                filesToAdd.push(path.relative(cwd, abs).replace(/\\/g, "/"));
            }
        }
    }

    // Merge with existing staged
    const existing = new Set(readStaged());
    for (const f of filesToAdd) existing.add(f);
    const staged = [...existing].sort();
    writeStaged(staged);

    console.log("");
    console.log(chalk.green(`✔  Staged ${filesToAdd.length} file(s)`));
    for (const f of filesToAdd.slice(0, 20)) {
        console.log(chalk.dim("  + ") + chalk.white(f));
    }
    if (filesToAdd.length > 20) {
        console.log(chalk.dim(`  ... and ${filesToAdd.length - 20} more`));
    }
    console.log("");
}
