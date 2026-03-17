import { Command } from "commander";
import chalk from "chalk";
import { readConfig, writeConfig } from "../utils.js";
import { pullCmd } from "./pull.js";

const checkout = new Command("checkout")
    .description("Switch to a branch")
    .argument("<branch>", "Branch name to switch to")
    .action(async (branchName) => {
        const config = readConfig();
        if (!config) {
            console.log(chalk.red("Not initialized. Run: collab init"));
            return;
        }

        // Update local config with active branch
        config.branch = branchName;
        writeConfig(config);

        console.log(chalk.green(`✓ Switched to branch '${branchName}'`));
        console.log(chalk.dim("Commits and pushes will now target this branch."));
        console.log("");

        // pull the files for the new branch
        await pullCmd();
    });

export default checkout;
