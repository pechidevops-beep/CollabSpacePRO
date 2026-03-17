#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import { initCmd } from "../src/commands/init.js";
import { addCmd } from "../src/commands/add.js";
import { checkCmd } from "../src/commands/check.js";
import { commitCmd } from "../src/commands/commit.js";
import { pushCmd } from "../src/commands/push.js";
import { pullCmd } from "../src/commands/pull.js";
import { logCmd } from "../src/commands/log.js";
import branchCmd from "../src/commands/branch.js";
import checkoutCmd from "../src/commands/checkout.js";

program
    .name("collab")
    .description(chalk.cyan("CollabSpace") + " — Version Control CLI")
    .version("1.0.0");

program
    .command("init")
    .description("Initialize a CollabSpace project in the current directory")
    .requiredOption("--repo <repoId>", "Repository ID (UUID)")
    .requiredOption("--token <token>", "Auth token (JWT)")
    .option("--remote <url>", "CollabSpace API URL", "http://localhost:5000")
    .action(initCmd);

program
    .command("add")
    .description("Stage files for the next commit")
    .argument("[paths...]", "Files or directories to stage", ["."])
    .action(addCmd);

program
    .command("check")
    .description("Show status of files (changed, new, deleted)")
    .action(checkCmd);

program
    .command("commit")
    .description("Create a local commit snapshot")
    .requiredOption("-m, --message <msg>", "Commit message")
    .action(commitCmd);

program
    .command("push")
    .description("Push committed files to CollabSpace")
    .action(pushCmd);

program
    .command("pull")
    .description("Pull latest files from CollabSpace")
    .action(pullCmd);

program
    .command("log")
    .description("Show commit history")
    .option("-n, --count <n>", "Number of commits to show", "10")
    .action(logCmd);

// ─── Phase 2: Branch commands ────────────────────────────────────────
program.addCommand(branchCmd);
program.addCommand(checkoutCmd);

program
    .command("status")
    .description("Show status of files (alias for check)")
    .action(checkCmd);

program.parse();
