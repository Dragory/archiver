import "dotenv/config";
import { Client, Intents } from "discord.js";
import { REST } from "@discordjs/rest";
import { registerCommands } from "./commands.js";
import { archiveCommand } from "./commands/archiveCommand.js";

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error("TOKEN environment variable not set");
  process.exit(1);
}

// prettier-ignore
const commandsToRegister = [
  archiveCommand,
];

const client = new Client({
  intents: [Intents.FLAGS.GUILD_MESSAGES],
});
const rest = new REST({ version: "9" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log('Received "ready" event, registering commands');
  await registerCommands(client, rest, commandsToRegister);
  console.log("Commands registered, listening to commands");
});

console.log("Logging in");
client.login(process.env.TOKEN);
