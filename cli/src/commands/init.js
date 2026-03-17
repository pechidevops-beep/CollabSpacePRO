import chalk from "chalk";
import { writeConfig, isInitialized } from "../utils.js";

export function initCmd(options) {
    if (isInitialized()) {
        console.log(chalk.yellow("⚠  Already initialized. Overwriting config..."));
    }

    writeConfig({
        remote: options.remote,
        repoId: options.repo,
        token: options.token,
    });

    console.log("");
    console.log(chalk.green("✔  CollabSpace project initialized!"));
    console.log("");
    console.log(chalk.dim("  Config saved to .collab/config.json"));
    console.log(chalk.dim("  Remote:  ") + chalk.cyan(options.remote));
    console.log(chalk.dim("  Repo ID: ") + chalk.cyan(options.repo));
    console.log("");
    console.log(chalk.dim("  Next steps:"));
    console.log(chalk.dim("    collab add .          ") + chalk.white("Stage all files"));
    console.log(chalk.dim("    collab commit -m \"\"   ") + chalk.white("Create a commit"));
    console.log(chalk.dim("    collab push           ") + chalk.white("Push to CollabSpace"));
}
