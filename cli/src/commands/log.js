import chalk from "chalk";
import { readConfig, readLocalCommits, apiFetch } from "../utils.js";

export async function logCmd(options) {
    const config = readConfig();
    const count = parseInt(options.count) || 10;
    const branch = config.branch || "main";

    // First show remote commits
    try {
        const remote = await apiFetch(config, `/commits?repoId=${config.repoId}&branch=${branch}`);

        if (remote && remote.length > 0) {
            console.log("");
            console.log(chalk.cyan(`  Remote commit history (${branch})`));
            console.log(chalk.dim("  ─────────────────────"));
            console.log("");

            for (const c of remote.slice(0, count)) {
                const date = new Date(c.created_at).toLocaleString();
                console.log(
                    chalk.yellow(`  ${c.hash.slice(0, 7)} `) +
                    chalk.white(c.message) +
                    chalk.dim(` (${date})`)
                );
            }

            if (remote.length > count) {
                console.log(chalk.dim(`  ... ${remote.length - count} more commits`));
            }
        } else {
            console.log(chalk.dim("  No remote commits yet"));
        }
    } catch (err) {
        console.log(chalk.dim("  Could not fetch remote commits: " + err.message));
    }

    // Then show local unpushed commits
    const local = readLocalCommits().filter((c) => !c.pushed);
    if (local.length > 0) {
        console.log("");
        console.log(chalk.yellow("  Local unpushed commits"));
        console.log(chalk.dim("  ─────────────────────"));
        console.log("");
        for (const c of local) {
            console.log(
                chalk.yellow(`  ${c.hash} `) +
                chalk.white(c.message) +
                chalk.red(" (not pushed)")
            );
        }
    }

    console.log("");
}
