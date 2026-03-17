import chalk from "chalk";
import { readConfig, readStaged, scanFiles, readLocalCommits, sha256, readFileContent } from "../utils.js";

export function checkCmd() {
    readConfig(); // verify initialized

    const cwd = process.cwd();
    const currentFiles = scanFiles(cwd);
    const staged = new Set(readStaged());
    const commits = readLocalCommits();
    const lastCommit = commits.length > 0 ? commits[commits.length - 1] : null;

    // Build map of last committed file hashes
    const committedHashes = {};
    if (lastCommit) {
        for (const f of lastCommit.files) {
            committedHashes[f.path] = f.hash;
        }
    }

    const newFiles = [];
    const modified = [];
    const staged_list = [];
    const unstaged = [];

    for (const filePath of currentFiles) {
        const content = readFileContent(filePath);
        const hash = sha256(content);

        if (staged.has(filePath)) {
            staged_list.push(filePath);
        }

        if (!committedHashes[filePath]) {
            newFiles.push(filePath);
        } else if (committedHashes[filePath] !== hash) {
            modified.push(filePath);
        }
    }

    // Deleted files (in last commit but not on disk)
    const deleted = Object.keys(committedHashes).filter(
        (p) => !currentFiles.includes(p)
    );

    // Unstaged = current files not in staged
    for (const f of currentFiles) {
        if (!staged.has(f)) unstaged.push(f);
    }

    console.log("");
    console.log(chalk.cyan("  CollabSpace Status"));
    console.log(chalk.dim("  ─────────────────"));
    console.log("");

    if (staged_list.length > 0) {
        console.log(chalk.green(`  Staged (${staged_list.length}):`));
        for (const f of staged_list.slice(0, 15)) {
            console.log(chalk.green("    ✓ ") + f);
        }
        if (staged_list.length > 15) console.log(chalk.dim(`    ... and ${staged_list.length - 15} more`));
        console.log("");
    }

    if (newFiles.length > 0) {
        console.log(chalk.yellow(`  New files (${newFiles.length}):`));
        for (const f of newFiles.slice(0, 10)) {
            console.log(chalk.yellow("    + ") + f);
        }
        if (newFiles.length > 10) console.log(chalk.dim(`    ... and ${newFiles.length - 10} more`));
        console.log("");
    }

    if (modified.length > 0) {
        console.log(chalk.blue(`  Modified (${modified.length}):`));
        for (const f of modified.slice(0, 10)) {
            console.log(chalk.blue("    ~ ") + f);
        }
        console.log("");
    }

    if (deleted.length > 0) {
        console.log(chalk.red(`  Deleted (${deleted.length}):`));
        for (const f of deleted.slice(0, 10)) {
            console.log(chalk.red("    - ") + f);
        }
        console.log("");
    }

    if (newFiles.length === 0 && modified.length === 0 && deleted.length === 0) {
        console.log(chalk.green("  ✔  Working directory clean — nothing to commit"));
        console.log("");
    }
}
