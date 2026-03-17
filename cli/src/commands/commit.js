import chalk from "chalk";
import { readConfig, readStaged, writeStaged, readLocalCommits, writeLocalCommits, readFileContent, sha256 } from "../utils.js";

export function commitCmd(options) {
    readConfig(); // verify initialized

    const staged = readStaged();
    if (staged.length === 0) {
        console.log(chalk.red("✗  Nothing staged. Run 'collab add .' first."));
        process.exit(1);
    }

    const message = options.message;

    // Read content of all staged files
    const files = staged.map((filePath) => {
        const content = readFileContent(filePath);
        return {
            path: filePath,
            content,
            hash: sha256(content),
        };
    });

    // Create commit hash
    const allContent = files
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((f) => `${f.path}:${f.hash}`)
        .join("\n");
    const commitHash = sha256(allContent + "|" + message + "|" + Date.now());

    // Save local commit
    const commits = readLocalCommits();
    const commit = {
        hash: commitHash.slice(0, 12),
        fullHash: commitHash,
        message,
        files,
        timestamp: new Date().toISOString(),
        pushed: false,
    };
    commits.push(commit);
    writeLocalCommits(commits);

    // Clear staged
    writeStaged([]);

    console.log("");
    console.log(chalk.green(`✔  Committed: `) + chalk.yellow(commitHash.slice(0, 7)) + chalk.dim(` ${message}`));
    console.log(chalk.dim(`   ${files.length} file(s) snapshotted`));
    console.log("");
    console.log(chalk.dim("   Run 'collab push' to upload to CollabSpace"));
    console.log("");
}
