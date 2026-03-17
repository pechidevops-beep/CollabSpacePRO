import chalk from "chalk";
import ora from "ora";
import fs from "node:fs";
import path from "node:path";
import { readConfig, writeHead, apiFetch } from "../utils.js";

export async function pullCmd() {
    const config = readConfig();
    const branch = config.branch || "main";

    const spinner = ora({
        text: chalk.dim(`  Pulling latest from CollabSpace (${branch})...`),
        color: "cyan",
    }).start();

    try {
        const result = await apiFetch(config, `/commits/latest?repoId=${config.repoId}&branch=${branch}`);

        if (!result.commit) {
            spinner.warn(chalk.yellow("  No commits found in remote repository"));
            return;
        }

        const files = result.files;
        let written = 0;

        for (const f of files) {
            const abs = path.resolve(process.cwd(), f.path);
            const dir = path.dirname(abs);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(abs, f.content, "utf8");
            written++;
        }

        writeHead(result.commit.hash);

        spinner.succeed(chalk.green(`  Pulled ${written} file(s)`));
        console.log("");
        console.log(chalk.dim("  Commit: ") + chalk.yellow(result.commit.hash.slice(0, 7)));
        console.log(chalk.dim("  Message: ") + result.commit.message);
        console.log(chalk.dim("  Date: ") + new Date(result.commit.created_at).toLocaleString());
        console.log("");

        for (const f of files.slice(0, 15)) {
            console.log(chalk.dim("  ↓ ") + chalk.white(f.path));
        }
        if (files.length > 15) {
            console.log(chalk.dim(`  ... and ${files.length - 15} more`));
        }
        console.log("");
    } catch (err) {
        spinner.fail(chalk.red(`  Pull failed: ${err.message}`));
    }
}
