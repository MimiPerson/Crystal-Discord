# Crystal Discord Bot

A Discord bot that integrates with Twitch chat, follows, and channel point redemptions. Built with TypeScript using Discord.js and Twurple.

## Features

- Real-time Twitch chat mirroring to Discord
- Channel point redemption tracking
- Follower/Unfollower detection
- Custom webhook messages with user avatars
- Emote support
- Moderation action logging (bans, timeouts, etc.)

## Prerequisites

- Node.js v16.x or higher
- Discord Bot Token
- Twitch Client ID and Secret
- Twitch OAuth tokens with required scopes

## Installation

1. Clone the repository:

```bash
git clone https://github.com/mimiperson/crystal-discord.git
cd crystal-discord
```

2. Install dependencies:

```bash
bun install
```

3. Create a `.env` file in the root directory:

```env
BOT_TOKEN=your_discord_bot_token
clientId=your_twitch_client_id
clientSecret=your_twitch_client_secret
```

4. Build the project:

```bash
bun run build
```

## Usage

Start the bot in development mode:

```bash
bun run dev
```

Start the bot in production mode:

```bash
bun run start
```

## Configuration

The bot can be configured through the following files:

- `config.ts` - Discord bot settings
- `src/Twitch/TwitchWebsocket.ts` - Twitch integration settings

### Required Twitch Scopes

- chat
- channel:read:redemptions
- channel:manage:redemptions
- channel:read:subscriptions
- bits:read
- channel:moderate
- moderation:read

## Project Structure

```
crystal-discord/
├── src/
│   ├── DiscordBot/
│   │   ├── DiscordBot.ts
│   │   └── interfaces.ts
│   ├── Twitch/
│   │   └── TwitchWebsocket.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Submit a pull request

## License

[MIT License](LICENSE)

## Author

Made by [Mimi_py](https://twitch.tv/mimi_py)

## Support

For support, join our [Discord server](your_discord_invite_link) or create an issue on GitHub.
