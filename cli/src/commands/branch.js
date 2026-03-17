import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { readConfig, apiFetch } from "../utils.js";

const branch = new Command("branch")
    .description("Create or list branches")
    .argument("[name]", "Branch name to create (omit to list)")
    .option("--from <branch>", "Source branch to fork from", "main")
    .action(async (name, opts) => {
        const config = readConfig();
        if (!config) {
            console.log(chalk.red("Not initialized. Run: collab init"));
            return;
        }

        if (!name) {
            // List branches
            try {
                const branches = await apiFetch(config, `/branches?repoId=${config.repoId}`);
                spinner.stop();
                console.log(chalk.bold("\nBranches:\n"));
                for (const b of branches) {
                    const marker = b.isDefault || b.name === "main" ? chalk.green("* ") : "  ";
                    console.log(`${marker}${chalk.cyan(b.name)}`);
                }
                console.log();
            } catch (e) {
                spinner.fail("Failed to fetch branches");
                console.log(chalk.red(e.message));
            }
            return;
        }

        // Create branch
        const spinner = ora(`Creating branch '${name}'...`).start();
        try {
            await apiFetch(config, "/branches", {
                method: "POST",
                body: JSON.stringify({
                    repoId: config.repoId,
                    name,
                    fromBranch: opts.from,
                }),
            });
            spinner.succeed(chalk.green(`Branch '${name}' created from '${opts.from}'`));
            console.log(chalk.dim(`\nSwitch with: collab checkout ${name}`));
        } catch (e) {
            spinner.fail("Failed to create branch");
            console.log(chalk.red(e.message));
        }
    });

export default branch;
