require("dotenv").config();
const { Client, GatewayIntentBits, Events, Partials, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// Snipe cache: channelId -> deleted message info
const snipeCache = new Map();

function hasImages(attachments) {
  return attachments.some(
    (a) =>
      (a.contentType && a.contentType.startsWith("image/")) ||
      /\.(png|jpg|jpeg|gif|webp|bmp|tiff|svg)$/i.test(a.name || "")
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildEmbed(info) {
  const hasText = !!info.content && info.content.trim().length > 0;
  const imagesExist = hasImages(info.attachments);
  const hasBoth = hasText && imagesExist;
  const hasOnlyImages = !hasText && imagesExist;
  const hasOtherFiles = info.attachments.length > 0 && !imagesExist;

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setAuthor({ name: info.authorTag, iconURL: info.authorAvatar || undefined })
    .setTimestamp(info.deletedAt)
    .setFooter({ text: `#${info.channelName} • ID: ${info.authorId}` });

  if (hasOnlyImages) {
    embed.setTitle("🖼️ Sawir la tirtiray");
    embed.setDescription(`**${info.authorTag}** waxay tirtireen sawir ka **#${info.channelName}**`);
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
    embed.setDescription(`**${info.authorTag}** waxay tirtireen fayl ka **#${info.channelName}**`);
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

// ── Ready ──────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Bot somali77 waa diyaar! Tag: ${readyClient.user.tag}`);

  // Register /snipe slash command globally
  const { REST, Routes, SlashCommandBuilder } = require("discord.js");
  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
  const commands = [
    new SlashCommandBuilder()
      .setName("snipe")
      .setDescription("Soo bandhig fariin u dambeysay ee la tirtiray channel-kan")
      .toJSON(),
  ];
  try {
    await rest.put(Routes.applicationCommands(readyClient.user.id), { body: commands });
    console.log("✅ /snipe command waa la diiwaan geliyay");
  } catch (err) {
    console.error("❌ Command registration failed:", err.message);
  }
});

// ── Auto delete log ────────────────────────────────────────────────────────
client.on(Events.MessageDelete, async (message) => {
  try {
    if (message.author?.bot) return;

    const hasText = message.content && message.content.trim().length > 0;
    const attachments = Array.from(message.attachments?.values() ?? []).map((a) => ({
      name: a.name ?? "unknown",
      url: a.url,
      contentType: a.contentType,
      size: a.size,
    }));

    if (!hasText && attachments.length === 0) return;

    const info = {
      content: message.content ?? null,
      authorTag: message.author?.tag ?? "Qof aan la garanin",
      authorId: message.author?.id ?? "0",
      authorAvatar: message.author?.displayAvatarURL() ?? null,
      channelId: message.channelId ?? "",
      channelName: message.channel?.name ?? "channel",
      attachments,
      deletedAt: new Date(),
    };

    snipeCache.set(info.channelId, info);

    const embed = buildEmbed(info);
    if (message.channel && "send" in message.channel) {
      await message.channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error("❌ MessageDelete error:", err.message);
  }
});

// ── !help prefix command ───────────────────────────────────────────────────
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const command = message.content.slice(1).trim().split(/\s+/)[0]?.toLowerCase();

  if (command === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🤖 Bot somali77 — Amarro")
      .setDescription("Hoos waxaad ka arki kartaa dhammaan amarka bot-ka")
      .addFields(
        {
          name: "🗑️ Auto Delete Log",
          value: "Si toos ah u soo bandhigaa fariimaha/sawiraha la tirtiray.",
          inline: false,
        },
        {
          name: "🎯 `/snipe`",
          value: "Soo bandhig fariin u dambeysay ee la tirtiray channel-kan.",
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

// ── /snipe slash command ───────────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "snipe") {
    const cached = snipeCache.get(interaction.channelId);
    if (!cached) {
      await interaction.reply({
        content: "❌ Wax fariin ah oo la tirtiray channel-kan kuma jiraan xusuusta bot-ka.",
        ephemeral: true,
      });
      return;
    }
    const embed = buildEmbed(cached);
    const title = embed.data.title ?? "Fariin la tirtiray";
    embed.setTitle("🎯 Snipe — " + title);
    await interaction.reply({ embeds: [embed] });
  }
});

// ── Login ──────────────────────────────────────────────────────────────────
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("❌ DISCORD_BOT_TOKEN env variable kuma jirto .env file-ka!");
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error("❌ Login failed:", err.message);
  process.exit(1);
});
