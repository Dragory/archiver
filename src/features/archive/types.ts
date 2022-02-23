import { GuildChannel, Message, MessageAttachment, User } from "discord.js";

export type ArchivedChannel = Pick<GuildChannel, "id" | "name">;

export type ArchivedUser = Pick<User, "id" | "username" | "discriminator">;

export type ArchivedMessage = Pick<Message, "id" | "content"> & {
  userId: string;
  attachments?: Array<Pick<MessageAttachment, "id" | "contentType">>;
};

export type ArchiveData = {
  channel: ArchivedChannel;
  users: ArchivedUser[];
  messages: ArchivedMessage[];
};
