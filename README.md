# somali77 — Discord Bot

Discord bot oo ogaanaya fariimaha iyo sawiraha la tirtiray, lana soo bandhigaa isla channel-ka.

## Awoodaha (Features)

- 🗑️ **Auto Delete Log** — marka qof fariin ama sawir tirtiro, bot-ka si toos ah ayuu dib ugu soo bandhigaa isla channel-ka
- 🎯 **`/snipe`** — soo bandhig fariin u dambeysay ee la tirtiray channel-ka
- ❓ **`!help`** — muuji liiska dhammaan amarka bot-ka

## Dejinta (Setup)

### 1. Discord Bot samee
1. Tag [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → magac u bixi
3. Geli **Bot** → **Add Bot**
4. Hoos u dhaadhac **Privileged Gateway Intents** → ku daji **ON**:
   - `Message Content Intent`
   - `Server Members Intent`
5. **Reset Token** → copy gare token-ka

### 2. Bot-ka Server-kaaga ku invite gare
Bot → **OAuth2** → **URL Generator**
- Scopes: `bot`, `applications.commands`
- Permissions: `Read Messages`, `Send Messages`, `View Message History`

### 3. Ku socodsii locally

```bash
# 1. Clone gare
git clone https://github.com/kyare4943-pixel/somali77-discord-bot.git
cd somali77-discord-bot

# 2. Install packages
npm install -g pnpm
pnpm install

# 3. .env file samee
cp .env.example .env
# .env ku qor token-kaaga:
# DISCORD_BOT_TOKEN=your_token_here

# 4. Bilow
pnpm --filter @workspace/api-server run dev
```

## .env file

```env
DISCORD_BOT_TOKEN=your_discord_bot_token_here
PORT=5000
```

## Amarro (Commands)

| Amar | Nooc | Sharax |
|------|------|--------|
| `!help` | Qoraal | Muuji dhammaan amarka |
| `/snipe` | Slash | Soo bandhig fariin u dambeysay ee la tirtiray |

## Stack

- Node.js + TypeScript
- discord.js v14
- Express 5
- pnpm workspaces
