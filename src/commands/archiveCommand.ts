import { typedCommand } from "../commands.js";

export const archiveCommand = typedCommand({
  name: "archive",
  description: "Create an archive of the current channel",
  handler(interaction) {
    interaction.reply("Test successful!");
  },
});
