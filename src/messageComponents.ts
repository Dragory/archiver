import {
  ButtonInteraction,
  CacheType,
  Client,
  ClientEvents,
  Constructable,
  Interaction,
  InteractionButtonOptions,
  MessageComponent,
  MessageComponentInteraction,
  MessageComponentOptions,
  MessageInteraction,
  SelectMenuInteraction,
} from "discord.js";
import * as crypto from "crypto";
import { omit } from "./utils/omit.js";
import { MessageComponentTypes } from "discord.js/typings/enums.js";

const componentTypeToInteractionClass = {
  [MessageComponentTypes.BUTTON]: ButtonInteraction,
  [MessageComponentTypes.SELECT_MENU]: SelectMenuInteraction,
};
type ComponentTypeToInteractionClass = typeof componentTypeToInteractionClass;
type ValidInteraction = ComponentTypeToInteractionClass[keyof ComponentTypeToInteractionClass]["prototype"];

function isValidInteraction(interaction: Interaction): interaction is ValidInteraction {
  return interaction.isMessageComponent() && ["BUTTON", "SELECT_MENU"].includes(interaction.componentType);
}

type DeregisterFn = () => void;
type ComponentInteractionHandler<TInteractionType extends keyof ComponentTypeToInteractionClass> = (
  interaction: ComponentTypeToInteractionClass[TInteractionType]["prototype"],
  deregister: DeregisterFn,
) => void;

export type InputComponent = Omit<MessageComponentOptions, "customId"> & {
  type: keyof ComponentTypeToInteractionClass;
};
export type CreateMessageComponentOptions<TComponent extends InputComponent> = {
  client: Client;
  component: TComponent;
  handler: ComponentInteractionHandler<TComponent["type"]>;
};

const clientComponents = new WeakMap<
  Client,
  Map<string, ComponentInteractionHandler<keyof ComponentTypeToInteractionClass>>
>();

/**
 * Create a message component with a handler automatically tied to it
 */
export function createMessageComponent<TComponent extends InputComponent>(
  options: CreateMessageComponentOptions<TComponent>,
): TComponent & { customId: string } {
  // We're doing the spread here instead of in the parameter list so the function signature is cleaner in an editor's 'View definition' popup
  const { client, component, handler } = options;

  if (!clientComponents.has(client)) {
    // Initialize the message component interaction handler the first time a message component is created for this client
    const interactionHandler: (...args: ClientEvents["interactionCreate"]) => void = (interaction) => {
      if (!isValidInteraction(interaction)) {
        return;
      }

      const componentsMap = clientComponents.get(interaction.client);
      if (!componentsMap) {
        return;
      }

      componentsMap.get(interaction.customId)?.(interaction, deregister);
    };
    client.on("interactionCreate", interactionHandler);
    const deregister = () => {
      client.off("interactionCreate", interactionHandler);
    };

    clientComponents.set(client, new Map());
  }

  // Generate a random ID for the new component and register it for our handler
  const customId = "cmp-" + crypto.randomBytes(32).toString("hex");
  clientComponents.get(client)!.set(customId, handler);

  return {
    ...component,
    customId,
  };
}
