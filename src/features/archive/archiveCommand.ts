import { typedCommand } from "../../commands.js";
import { MessageButtonStyles, MessageComponentTypes } from "discord.js/typings/enums.js";
import { Permissions, TextChannel } from "discord.js";
import { createMessageComponent } from "../../messageComponents.js";
import { join as joinPath } from "path";
import { mkdir, rm, writeFile } from "fs/promises";
import { format as formatDate } from "date-fns";
import { ArchiveData, ArchivedMessage, ArchivedUser } from "./types.js";
import { downloadFile } from "./downloadFile.js";

const ARCHIVAL_BATCH_SIZE = 50;
const REPORTING_INTERVAL = 200;

const archivalProcesses = new Set<string>();

export const archiveCommand = typedCommand({
  name: "archive",
  description: "Create an archive of the current channel",
  async handler(interaction) {
    const channel = (await interaction.guild!.channels.fetch(interaction.channelId))! as TextChannel;
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    if (!member?.permissionsIn(interaction.channelId).has(Permissions.FLAGS.MANAGE_CHANNELS)) {
      interaction.reply({
        ephemeral: true,
        content: "You need to have Manage Channel permission on the channel you want to archive",
      });
      return;
    }

    if (archivalProcesses.has(interaction.channelId)) {
      interaction.reply({
        ephemeral: true,
        content: "This channel is already being archived!",
      });
      return;
    }

    let cancelFn: (() => void) | null = null;

    interaction.reply({
      content: "Archiving...",
      components: [
        {
          type: MessageComponentTypes.ACTION_ROW,
          components: [
            // Cancel button
            createMessageComponent({
              client: interaction.client,
              component: {
                type: MessageComponentTypes.BUTTON,
                label: "Cancel",
                style: MessageButtonStyles.DANGER,
              },
              async handler(buttonInteraction, deregister) {
                deregister(); // Button only works once
                interaction.editReply("Cancelling..."); // Edit original reply...
                await buttonInteraction.deferReply({
                  // ...while preparing an ephemeral reply to confirm the action
                  ephemeral: true,
                });

                cancelFn = () => {
                  interaction.deleteReply(); // Once the operation has been cancelled, remove the public message...
                  buttonInteraction.editReply("Archival cancelled!"); // ...and update the ephemeral reply
                };
              },
            }),
          ],
        },
      ],
    });

    archivalProcesses.add(interaction.channelId);

    try {
      // Create target directory structure
      const now = new Date();
      const outDir = joinPath(process.cwd(), "out", `${channel.id}-${formatDate(now, "yyyy-MM-dd-HH-mm")}`);
      await mkdir(outDir, { recursive: true });
      const attachmentsDir = joinPath(outDir, "attachments");
      await mkdir(attachmentsDir);
      const avatarsDir = joinPath(outDir, "avatars");
      await mkdir(avatarsDir);

      const archivedUsers = new Map<string, ArchivedUser>();
      const archivedMessages: ArchivedMessage[] = [];

      let n = 0;
      let before: string | undefined = undefined;
      do {
        const batch = await channel.messages.fetch({
          before,
          limit: ARCHIVAL_BATCH_SIZE,
        });
        if (batch.size === 0) {
          break;
        }

        // See https://github.com/microsoft/TypeScript/issues/43047#issuecomment-874221939 for the reason for the type annotation here
        before = batch.last()!.id as string;

        for (const message of batch.values()) {
          if (cancelFn) {
            break;
          }

          if (!archivedUsers.has(message.author.id)) {
            // Download avatar
            const avatarUrl = message.author.avatarURL({ format: "png" }) || message.author.defaultAvatarURL;
            await downloadFile(avatarUrl, joinPath(avatarsDir, `${message.author.id}.png`));

            archivedUsers.set(message.author.id, {
              id: message.author.id,
              username: message.author.username,
              discriminator: message.author.discriminator,
            });
          }

          const archivedMessage: ArchivedMessage = {
            id: message.id,
            content: message.content,
            userId: message.author.id,
          };

          if (message.attachments.size > 0) {
            // Download attachments
            await Promise.all(
              message.attachments.map(async (attachment) =>
                downloadFile(attachment.url, joinPath(attachmentsDir, attachment.id)),
              ),
            );

            archivedMessage.attachments = message.attachments.map((attachment) => ({
              id: attachment.id,
              contentType: attachment.contentType,
            }));
          }

          archivedMessages.unshift(archivedMessage);
        }

        if (batch.size < ARCHIVAL_BATCH_SIZE) {
          break;
        }

        n += batch.size;
        if (n % REPORTING_INTERVAL === 0 && cancelFn == null) {
          const upToDate = new Date(batch.last()!.createdTimestamp);
          interaction.editReply(`Archiving... (${n} total, up to ${formatDate(upToDate, "d MMM y, H:mm (xxxxx)")})`);
        }
      } while (cancelFn == null);

      if (cancelFn) {
        await rm(outDir, { recursive: true });
        (cancelFn as () => void)();
        return;
      }

      const archiveData: ArchiveData = {
        channel: {
          id: channel.id,
          name: channel.name,
        },
        users: Array.from(archivedUsers.values()),
        messages: archivedMessages,
      };
      await writeFile(joinPath(outDir, "archive.json"), JSON.stringify(archiveData, null, 2), { encoding: "utf8" });

      interaction.deleteReply();
      interaction.followUp("Archival finished!");
    } finally {
      archivalProcesses.delete(interaction.channelId);
    }
  },
});
