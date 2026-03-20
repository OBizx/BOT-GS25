require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ── Cấu hình ──────────────────────────────────────────────
const OFFLINE_ROLE_NAME = "offline";
const GUEST_ROLE_NAME = "Khách";
const MALE_ROLE_NAME = "Nam";
const FEMALE_ROLE_NAME = "Nữ";
const GS25_ROLE_NAME = "GS25";

const BUTTON_MALE = "role_nam";
const BUTTON_FEMALE = "role_nu";
const BUTTON_GS25 = "role_gs25";

// ── Slash commands ─────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName("setup-roles")
    .setDescription("Gửi tin nhắn chọn role Nam / Nữ vào kênh này")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("setup-gs25")
    .setDescription("Gửi tin nhắn lấy role GS25 vào kênh này")
    .toJSON(),
];

// ── Sự kiện ready ──────────────────────────────────────────
client.once("ready", async () => {
  console.log(`Bot is ready: ${client.user.tag}`);

  // Đăng ký slash command cho tất cả server
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  try {
    for (const guild of client.guilds.cache.values()) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guild.id),
        { body: commands }
      );
      console.log(`📌 Đã đăng ký slash command cho server: ${guild.name}`);
    }
  } catch (err) {
    console.error("Lỗi đăng ký slash command:", err);
  }

  // ── [ĐÃ TẮT] Quét và gán role offline cho member chưa có role ──
  // client.guilds.cache.forEach(async (guild) => {
  //   const members     = await guild.members.fetch();
  //   const offlineRole = guild.roles.cache.find((r) => r.name === OFFLINE_ROLE_NAME);
  //
  //   if (!offlineRole) {
  //     console.log(`Không tìm thấy role "${OFFLINE_ROLE_NAME}" ở server ${guild.name}`);
  //     return;
  //   }
  //
  //   for (const member of members.values()) {
  //     if (member.user.bot) continue;
  //     if (member.roles.cache.size <= 1) {
  //       try {
  //         await member.roles.add(offlineRole);
  //         console.log(`(Scan) Gán offline cho ${member.user.tag}`);
  //       } catch (err) {
  //         console.error(err);
  //       }
  //     }
  //   }
  // });
});

// ── Gán role Khách khi member mới vào ─────────────────────
client.on("guildMemberAdd", async (member) => {
  try {
    const guestRole = member.guild.roles.cache.find((r) => r.name === GUEST_ROLE_NAME);
    if (!guestRole) {
      console.log(`⚠️  Không tìm thấy role "${GUEST_ROLE_NAME}"`);
      return;
    }
    await member.roles.add(guestRole);
    console.log(`Đã gán role Khách cho ${member.user.tag}`);
  } catch (err) {
    console.error(err);
  }
});

// ── Xử lý interaction (slash command + button) ─────────────
client.on("interactionCreate", async (interaction) => {

  // === Slash command /setup-roles ===
  if (interaction.isChatInputCommand() && interaction.commandName === "setup-roles") {
    const embed = new EmbedBuilder()
      .setTitle("Chọn giới tính của bạn")
      .setDescription(
        "Nhấn vào nút bên dưới để nhận role tương ứng.\n" +
        "Nhấn lại vào nút đang chọn để **bỏ** role đó."
      )
      .setColor(0x5865f2)
      .setFooter({ text: "Mỗi người chỉ có thể chọn một giới tính." });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BUTTON_MALE)
        .setLabel("♂ Nam")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(BUTTON_FEMALE)
        .setLabel("♀ Nữ")
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
    return;
  }

  // === Slash command /setup-gs25 ===
  if (interaction.isChatInputCommand() && interaction.commandName === "setup-gs25") {
    const embed = new EmbedBuilder()
      .setTitle("Tụ Nghĩa Sảnh - GS25")
      .setDescription(
        "Nếu bạn là thành viên của **Tụ Nghĩa Sảnh** thì lấy role **GS25** ở đây nhé!\n" +
        "> Nhấn nút bên dưới để nhận role. Nhận xong role xong thì sẽ không còn là **Khách** nữa đâu nhé!\n" +
        "> Giờ bạn đã là người nhà rồi. Nhớ tuân thủ nội quy của server nhé!"
      )
      .setColor(0xf1c40f)
      .setFooter({ text: "Chỉ dành cho thành viên Tụ Nghĩa Sảnh." });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BUTTON_GS25)
        .setLabel("Lấy role GS25")
        .setStyle(ButtonStyle.Success),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
    return;
  }

  // === Button click chọn role ===
  if (interaction.isButton()) {
    const { customId, guild } = interaction;

    if (customId !== BUTTON_MALE && customId !== BUTTON_FEMALE && customId !== BUTTON_GS25) return;

    // Chỉ fetch lại đúng member đang click (tránh rate limit)
    const member = await interaction.member.fetch();

    // === Xử lý button GS25 ===
    if (customId === BUTTON_GS25) {
      const gs25Role = guild.roles.cache.find((r) => r.name === GS25_ROLE_NAME);
      const guestRole = guild.roles.cache.find((r) => r.name === GUEST_ROLE_NAME);

      if (!gs25Role) {
        await interaction.reply({
          content: `Không tìm thấy role **${GS25_ROLE_NAME}** trên server. Hãy tạo role này trước!`,
          flags: 64,
        });
        return;
      }

      const hasGs25 = member.roles.cache.has(gs25Role.id);
      try {
        if (hasGs25) {
          // Toggle: bấm lại thì gỡ
          await member.roles.remove(gs25Role);
          await interaction.reply({
            content: `Đã **gỡ** role **${GS25_ROLE_NAME}** của bạn.`,
            flags: 64,
          });
        } else {
          await member.roles.add(gs25Role);
          // Gỡ role Khách nếu đang có
          if (guestRole && member.roles.cache.has(guestRole.id)) {
            await member.roles.remove(guestRole);
          }
          await interaction.reply({
            content: `Đã gán role **${GS25_ROLE_NAME}** cho bạn! Role **Khách** đã được gỡ.`,
            flags: 64,
          });
        }
        console.log(`[GS25] ${member.user.tag} → ${hasGs25 ? "gỡ" : "nhận"} role GS25`);
      } catch (err) {
        console.error("Lỗi gán/gỡ role GS25:", err);
        await interaction.reply({
          content: "Có lỗi xảy ra, vui lòng thử lại sau.",
          flags: 64,
        });
      }
      return;
    }

    // === Xử lý button Nam / Nữ ===
    const maleRole = guild.roles.cache.find((r) => r.name === MALE_ROLE_NAME);
    const femaleRole = guild.roles.cache.find((r) => r.name === FEMALE_ROLE_NAME);

    if (!maleRole || !femaleRole) {
      await interaction.reply({
        content: `Không tìm thấy role **${MALE_ROLE_NAME}** hoặc **${FEMALE_ROLE_NAME}** trên server. Hãy tạo 2 role này trước!`,
        flags: 64,
      });
      return;
    }

    const isChoosingMale = customId === BUTTON_MALE;
    const chosenRole = isChoosingMale ? maleRole : femaleRole;
    const oppositeRole = isChoosingMale ? femaleRole : maleRole;
    const chosenName = isChoosingMale ? "♂ Nam" : "♀ Nữ";

    const hasRole = member.roles.cache.has(chosenRole.id);

    try {
      if (hasRole) {
        // Toggle: đã có role → gỡ ra
        await member.roles.remove(chosenRole);
        await interaction.reply({
          content: `Đã **gỡ** role **${chosenName}** của bạn.`,
          flags: 64,
        });
      } else {
        // Gỡ role đối lập nếu đang có
        if (member.roles.cache.has(oppositeRole.id)) {
          await member.roles.remove(oppositeRole);
        }
        await member.roles.add(chosenRole);
        await interaction.reply({
          content: `Đã gán role **${chosenName}** cho bạn!`,
          flags: 64,
        });
      }
      console.log(`[Role] ${member.user.tag} → ${hasRole ? "gỡ" : "nhận"} role ${chosenRole.name}`);
    } catch (err) {
      console.error("Lỗi gán/gỡ role:", err);
      await interaction.reply({
        content: "Có lỗi xảy ra, vui lòng thử lại sau.",
        flags: 64,
      });
    }
  }
});

// ── Chống crash khi gặp lỗi không xử lý ────────────────────
process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err?.message ?? err);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err?.message ?? err);
});

// ── Đăng nhập ───────────
client.login(process.env.TOKEN);
