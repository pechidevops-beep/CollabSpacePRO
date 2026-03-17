import chalk from "chalk";
import ora from "ora";
import { readConfig, readLocalCommits, writeLocalCommits, writeHead, apiFetch } from "../utils.js";

export async function pushCmd() {
    const config = readConfig();
    const commits = readLocalCommits();
    const unpushed = commits.filter((c) => !c.pushed);

    if (unpushed.length === 0) {
        console.log(chalk.yellow("⚠  Nothing to push. Commit first with 'collab commit -m \"...\"'"));
        return;
    }

    console.log("");
    console.log(chalk.cyan(`  Pushing ${unpushed.length} commit(s) to CollabSpace...`));
    console.log("");

    for (const commit of unpushed) {
        const spinner = ora({
            text: chalk.dim(`  ${commit.hash} ${commit.message}`),
            color: "cyan",
        }).start();

        try {
            const result = await apiFetch(config, "/commits/push", {
                method: "POST",
                body: JSON.stringify({
                    repoId: config.repoId,
                    message: commit.message,
                    branch: config.branch || "main",
                    files: commit.files.map((f) => ({ path: f.path, content: f.content })),
                }),
            });

            commit.pushed = true;
            writeHead(commit.fullHash);
            spinner.succeed(chalk.green(`  ${commit.hash} `) + chalk.dim(commit.message) + chalk.dim(` → ${result.filesCount} files`));
        } catch (err) {
            spinner.fail(chalk.red(`  ${commit.hash} `) + chalk.red(err.message));
            break;
        }
    }

    // Save updated push status
    writeLocalCommits(commits);
    console.log("");
    console.log(chalk.green("✔  Push complete!"));
    console.log("");
}
