import {
  Client,
  GatewayIntentBits,
  Events,
  Message,
  PartialMessage,
  Partials,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "./lib/logger";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageTyping,
  ],
  partials: [Partials.Message, Partials.Channel],
});

interface DeletedMessageInfo {
  content: string | null;
  authorTag: string;
  authorId: string;
  authorAvatar: string | null;
  channelId: string;
  channelName: string;
  attachments: Array<{
    name: string;
    url: string;
    contentType: string | null;
    size: number;
  }>;
  deletedAt: Date;
}

const snipeCache = new Map<string, DeletedMessageInfo>();

function hasImages(attachments: DeletedMessageInfo["attachments"]): boolean {
  return attachments.some(
    (a) =>
      a.contentType?.startsWith("image/") ||
      /\.(png|jpg|jpeg|gif|webp|bmp|tiff|svg)$/i.test(a.name)
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildDeletedEmbed(info: DeletedMessageInfo): EmbedBuilder {
  const hasText = !!info.content && info.content.trim().length > 0;
  const imagesOnly = hasImages(info.attachments);
  const hasAttachments = info.attachments.length > 0;
  const hasBoth = hasText && imagesOnly;
  const hasOnlyImages = !hasText && imagesOnly;
  const hasOtherFiles = hasAttachments && !imagesOnly;

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setAuthor({
      name: info.authorTag,
      iconURL: info.authorAvatar ?? undefined,
    })
    .setTimestamp(info.deletedAt)
    .setFooter({ text: `#${info.channelName} • ID: ${info.authorId}` });

  if (hasOnlyImages) {
    embed.setTitle("🖼️ Sawir la tirtiray");
    embed.setDescription(
      `**${info.authorTag}** waxay tirtireen sawir ka **#${info.channelName}**`
    );
  } else if (hasBoth) {
    embed.setTitle("🗑️ Fariin iyo Sawiro la tirtireen");
    embed.setDescription(
      `**${info.authorTag}** waxay tirtireen fariin iyo sawiro ka **#${info.channelName}**\n\n**Qoraalka:**\n${info.content}`
    );
  } else if (hasOtherFiles && hasText) {
    embed.setTitle("🗑️ Fariin iyo Fayl la tirtireen");
    embed.setDescription(
      `**${info.authorTag}** waxay tirtireen fariin iyo fayl ka **#${info.channelName}**\n\n**Qoraalka:**\n${info.content}`
    );
  } else if (hasOtherFiles) {
    embed.setTitle("📎 Fayl la tirtiray");
    embed.setDescription(
      `**${info.authorTag}** waxay tirtireen fayl ka **#${info.channelName}**`
    );
  } else {
    embed.setTitle("🗑️ Fariin la tirtiray");
    embed.setDescription(
      `**${info.authorTag}** waxay tirtireen fariin ka **#${info.channelName}**\n\n**Qoraalka:**\n${info.content}`
    );
  }

  if (info.attachments.length > 0) {
    const fileList = info.attachments
      .map((a) => `• [${a.name}](${a.url}) (${formatSize(a.size)})`)
      .join("\n");
    embed.addFields({ name: "Faylasha", value: fileList });
  }

  return embed;
}

async function registerCommands(token: string, clientId: string): Promise<void> {
  const commands = [
    new SlashCommandBuilder()
      .setName("snipe")
      .setDescription("Soo bandhig fariin u dambeysay ee la tirtiray channel-kan")
      .toJSON(),
  ];

  const rest = new REST().setToken(token);
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  logger.info("Slash commands waa la diiwaan geliyay (/snipe)");
}

client.once(Events.ClientReady, async (readyClient) => {
  logger.info({ tag: readyClient.user.tag }, "Bot somali77 waa diyaar!");
  const token = process.env["DISCORD_BOT_TOKEN"]!;
  try {
    await registerCommands(token, readyClient.user.id);
  } catch (err) {
    logger.error({ err }, "Khalad markii la diiwaan gelinayay commands");
  }
});

client.on(
  Events.MessageDelete,
  async (message: Message | PartialMessage) => {
    try {
      if (message.author?.bot) return;

      const hasText = message.content && message.content.trim().length > 0;
      const attachments = Array.from(message.attachments?.values() ?? []).map(
        (a) => ({
          name: a.name ?? "unknown",
          url: a.url,
          contentType: a.contentType,
          size: a.size,
        })
      );
      const hasAttachments = attachments.length > 0;

      if (!hasText && !hasAttachments) return;

      const info: DeletedMessageInfo = {
        content: message.content ?? null,
        authorTag: message.author?.tag ?? "Qof aan la garanin",
        authorId: message.author?.id ?? "0",
        authorAvatar: message.author?.displayAvatarURL() ?? null,
        channelId: message.channelId ?? "",
        channelName:
          "name" in (message.channel ?? {})
            ? (message.channel as { name?: string }).name ?? "channel"
            : "channel",
        attachments,
        deletedAt: new Date(),
      };

      snipeCache.set(info.channelId, info);

      const embed = buildDeletedEmbed(info);

      const channel = message.channel;
      if (!channel || !("send" in channel)) return;

      await (channel as { send: (opts: { embeds: EmbedBuilder[] }) => Promise<unknown> }).send({ embeds: [embed] });

      logger.info(
        {
          author: info.authorTag,
          channel: info.channelName,
          hasText: !!hasText,
          hasImages: hasImages(attachments),
        },
        "Fariin la tirtiray ayaa la soo bandhigay"
      );
    } catch (err) {
      logger.error({ err }, "Khalad ayaa dhacay markii la tirtiray fariin");
    }
  }
);

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args[0]?.toLowerCase();

  if (command === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🤖 Bot somali77 — Amarro")
      .setDescription("Hoos waxaad ka arki kartaa dhammaan amarka bot-ka")
      .addFields(
        {
          name: "🗑️ Auto Delete Log",
          value:
            "Bot-ka si toos ah ayuu u ogaanayaa marka qof fariin ama sawir tirtiro, kadibna dib u soo bandhigaa isla channel-ka.",
          inline: false,
        },
        {
          name: "🎯 `/snipe`",
          value:
            "Soo bandhig fariin u dambeysay ee la tirtiray channel-kan. Waa slash command.",
          inline: false,
        },
        {
          name: "❓ `!help`",
          value: "Muuji liiska dhammaan amarka bot-ka (tani).",
          inline: false,
        }
      )
      .setFooter({ text: "somali77 bot • prefix: !" })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = interaction as ChatInputCommandInteraction;

  if (cmd.commandName === "snipe") {
    try {
      const cached = snipeCache.get(cmd.channelId);

      if (!cached) {
        await cmd.reply({
          content: "❌ Wax fariin ah oo la tirtiray channel-kan kuma jiraan xusuusta bot-ka.",
          ephemeral: true,
        });
        return;
      }

      const embed = buildDeletedEmbed(cached);
      embed.setTitle("🎯 Snipe — " + (embed.data.title ?? "Fariin la tirtiray"));

      await cmd.reply({ embeds: [embed] });
    } catch (err) {
      logger.error({ err }, "Khalad markii la fuliyay /snipe");
      await cmd.reply({
        content: "❌ Khalad ayaa dhacay. Isku day mar kale.",
        ephemeral: true,
      }).catch(() => undefined);
    }
  }
});

export function startBot(): void {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    logger.error("DISCORD_BOT_TOKEN environment variable is not set");
    process.exit(1);
  }
  client.login(token).catch((err) => {
    logger.error({ err }, "Bot login failed");
    process.exit(1);
  });
}
