import {
  ApplicationCommand,
  ChatInputApplicationCommandData,
  Client,
  ClientEvents,
  CommandInteraction,
} from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { ApplicationCommandTypes } from "discord.js/typings/enums.js";
import { omit } from "./utils/omit.js";

export type Command = ChatInputApplicationCommandData & {
  handler: (interaction: CommandInteraction) => void;
};

/**
 * Passthrough/id function as a type helper
 */
export function typedCommand<TCommand extends Command>(command: TCommand): TCommand {
  return command;
}

/**
 * @return - Function to unregister the interaction listener
 */
export async function registerCommands(client: Client, rest: REST, commands: Command[]): Promise<() => void> {
  await updateDiscordCommands(client.application!.id, rest, commands);
  return setupInteractionHandler(client, commands);
}

/**
 * Create/update application command metadata through the API
 */
async function updateDiscordCommands(clientId: string, rest: REST, commands: Command[]): Promise<void> {
  const commandsToAdd: ChatInputApplicationCommandData[] = commands.map((cmd) => omit(cmd, ["handler"]));

  if (process.env.NODE_ENV === "development") {
    console.log("Registering guild commands for development");

    const DEVELOPMENT_GUILD_ID = process.env.DEVELOPMENT_GUILD_ID;
    if (!DEVELOPMENT_GUILD_ID) {
      throw new Error("DEVELOPMENT_GUILD_ID environment variable not set");
    }

    await rest.put(Routes.applicationGuildCommands(clientId, DEVELOPMENT_GUILD_ID), {
      body: commandsToAdd,
    });
  } else {
    console.log("Registering global commands for production");
    await rest.put(Routes.applicationCommands(clientId), {
      body: commandsToAdd,
    });
  }
}

/**
 * Set up an event handler for incoming command interactions that runs the matching command's command handler
 */
function setupInteractionHandler(client: Client, commands: Command[]): () => void {
  const interactionCreateHandler: (...args: ClientEvents["interactionCreate"]) => void = (interaction) => {
    if (!interaction.isCommand()) {
      return;
    }

    for (const command of commands) {
      if (command.name === interaction.commandName) {
        command.handler(interaction);
      }
    }
  };

  client.on("interactionCreate", interactionCreateHandler);
  return () => {
    client.off("interactionCreate", interactionCreateHandler);
  };
}
