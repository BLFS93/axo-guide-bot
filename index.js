require("dotenv").config();
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

const WEBSITE_URL = process.env.WEBSITE_URL || "https://stayaxo.com";
const TELEGRAM_URL = process.env.TELEGRAM_URL || "https://t.me/AXO_Community";
const X_URL = process.env.X_URL || "https://x.com/AxoOnPump";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "NOT_LAUNCHED";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const userMessages = new Map();
const userViolations = new Map();

const SPAM_TIME_WINDOW = 10 * 1000;
const SPAM_MAX_MESSAGES = 4;
const SECOND_VIOLATION_WINDOW = 5 * 60 * 1000;
const RESET_AFTER = 24 * 60 * 60 * 1000;

const officialLinks = [
  "stayaxo.com",
  "https://stayaxo.com",
  "t.me/AXO_Community",
  "https://t.me/AXO_Community",
  "x.com/AxoOnPump",
  "https://x.com/AxoOnPump"
];

async function isAdmin(ctx) {
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return member.status === "creator" || member.status === "administrator";
  } catch {
    return false;
  }
}

function containsLink(text) {
  const lower = text.toLowerCase();

  return (
    lower.includes("http://") ||
    lower.includes("https://") ||
    lower.includes("www.") ||
    lower.includes("t.me/") ||
    lower.includes(".com") ||
    lower.includes(".io") ||
    lower.includes(".xyz") ||
    lower.includes(".net") ||
    lower.includes(".org")
  );
}

function isOfficialLink(text) {
  return officialLinks.some((link) =>
    text.toLowerCase().includes(link.toLowerCase())
  );
}

async function sendAdminReport(ctx, reason) {
  if (!ADMIN_CHAT_ID) return;

  const reporter = ctx.from;
  const replied = ctx.message?.reply_to_message;
  const reportedUser = replied?.from;
  const reportedText = replied?.text || replied?.caption || "No replied message text.";
  const reportText = ctx.message?.text || "No report command text.";

  await ctx.telegram.sendMessage(
    ADMIN_CHAT_ID,
`🚨 AXO Guide Admin Report

Reason:
${reason}

Reporter:
${reporter.first_name || "Unknown"} ${reporter.username ? "(@" + reporter.username + ")" : ""}
Reporter ID:
${reporter.id}

Reported user:
${reportedUser ? `${reportedUser.first_name || "Unknown"} ${reportedUser.username ? "(@" + reportedUser.username + ")" : ""}` : "No user detected. User did not reply to a message."}

Reported user ID:
${reportedUser ? reportedUser.id : "Not available"}

Report command:
${reportText}

Reported message:
${reportedText}

Group:
${ctx.chat.title || ctx.chat.id}

Stay Curious.
Stay AXO.`
  );
}

async function muteUser(ctx, userId, level) {
  let muteSeconds;
  let message;

  if (level === 1) {
    muteSeconds = 60;
    message =
`🚨 AXO Guide Warning

Spam or suspicious activity detected.

Penalty System:

1st violation → 1 minute mute
2nd violation within 5 minutes → 5 minute mute
3rd violation → 24 hour mute

Current penalty:
⏳ 1 minute mute

Stay Curious.
Stay AXO.`;
  } else if (level === 2) {
    muteSeconds = 5 * 60;
    message =
`🚨 AXO Guide Warning

You continued spamming after your first penalty.

Penalty System:

1st violation → 1 minute mute
2nd violation within 5 minutes → 5 minute mute
3rd violation → 24 hour mute

Current penalty:
⏳ 5 minute mute

Stay Curious.
Stay AXO.`;
  } else {
    muteSeconds = 24 * 60 * 60;
    message =
`🚨 AXO Guide Final Warning

Multiple spam or scam violations detected.

Penalty System:

1st violation → 1 minute mute
2nd violation within 5 minutes → 5 minute mute
3rd violation → 24 hour mute

Current penalty:
⏳ 24 hour mute

After 24 hours your record will automatically reset.

Stay Curious.
Stay AXO.`;
  }

  const untilDate = Math.floor(Date.now() / 1000) + muteSeconds;

  await ctx.telegram.restrictChatMember(ctx.chat.id, userId, {
    permissions: {
      can_send_messages: false
    },
    until_date: untilDate
  });

  await ctx.reply(message);
}

async function handleViolation(ctx, reason) {
  const userId = ctx.from.id;
  const now = Date.now();

  const current = userViolations.get(userId);

  let level = 1;

  if (current) {
    const timeSinceLast = now - current.lastViolationAt;

    if (now - current.firstViolationAt > RESET_AFTER) {
      level = 1;
    } else if (current.level === 1 && timeSinceLast <= SECOND_VIOLATION_WINDOW) {
      level = 2;
    } else if (current.level >= 2) {
      level = 3;
    } else {
      level = 1;
    }
  }

  userViolations.set(userId, {
    level,
    firstViolationAt: current?.firstViolationAt || now,
    lastViolationAt: now
  });

  try {
    await ctx.deleteMessage();
  } catch (error) {
    console.log("Could not delete message:", error.message);
  }

  await muteUser(ctx, userId, level);
  await sendAdminReport(ctx, reason);
}

bot.start((ctx) => {
  ctx.reply(
`Welcome to AXO 🩷🌎

Born in Mexico.
Destined for the world. 🇲🇽

Stay Curious.
Stay AXO.

Use:
/links
/ca
/rules`
  );
});

bot.command("links", (ctx) => {
  ctx.reply(
`AXO Official Links 🩷

🌐 Website:
${WEBSITE_URL}

💬 Telegram:
${TELEGRAM_URL}

𝕏 X:
${X_URL}`
  );
});

bot.command("ca", (ctx) => {
  if (CONTRACT_ADDRESS === "NOT_LAUNCHED") {
    ctx.reply(
`⚠️ $AXO has not launched yet.

There is currently NO official contract address.

Any CA posted before the official launch is fake.

Always verify through the official AXO website and Telegram.

Stay Curious.
Stay AXO.`
    );
  } else {
    ctx.reply(
`Official $AXO CA:
${CONTRACT_ADDRESS}

Stay Curious.
Stay AXO.`
    );
  }
});

bot.command("rules", (ctx) => {
  ctx.reply(
`AXO Community Rules 🩷

1. Be respectful.
2. No spam.
3. No fake contract addresses.
4. No scam links.
5. Do not impersonate admins.
6. Always verify official links.

Stay Curious.
Stay AXO.`
  );
});

bot.on("new_chat_members", (ctx) => {
  ctx.reply(
`Welcome to AXO 🩷🌎

Born in Mexico.
Destined for the world.

Stay Curious.
Stay AXO.

Use /links to find all official AXO links.

⚠️ $AXO has not launched yet.
Do not trust fake contract addresses.`
  );
});

bot.on("message", async (ctx, next) => {
  if (!ctx.message || !ctx.from || !ctx.chat) return next();
  
  if (ctx.chat.type === "private") {
  return next();
}
  const text = ctx.message.text || "";
  const lowerText = text.toLowerCase();
  const userId = ctx.from.id;
  const now = Date.now();

  const admin = await isAdmin(ctx);
  if (admin) return next();

  const reportCommands = ["/spam", "/block", "/ban", "/report", "/scam", "/blockieren"];

if (reportCommands.some((cmd) => lowerText.startsWith(cmd))) {
  await sendAdminReport(ctx, "User submitted a report command.");

  await ctx.reply(
`🚨 AXO Guide

Report forwarded to admins.

Stay Curious.
Stay AXO.`
  );

  return;
}

  if (containsLink(text) && !isOfficialLink(text)) {
    await handleViolation(ctx, "Unofficial link or suspicious link posted.");
    return;
  }

  const timestamps = userMessages.get(userId) || [];
  const recentMessages = timestamps.filter((time) => now - time < SPAM_TIME_WINDOW);
  recentMessages.push(now);
  userMessages.set(userId, recentMessages);

  if (recentMessages.length > SPAM_MAX_MESSAGES) {
    await handleViolation(ctx, "Spam detected: too many messages in a short time.");
    return;
  }

  return next();
});

bot.launch();

console.log("AXO Telegram Bot is running...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));