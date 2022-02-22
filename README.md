# Archiver
⚠ WIP

## Development

### Requirements
* Node.js 16.6.0 or newer
* Linux or macOS (WSL2 works on Windows)

### Setup
1. Create an application + bot in the [Discord Developer Portal](https://discord.com/developers)
2. Invite the bot to a test server (see [Invite link](#invite-link) below)
3. Clone the repository
4. Run `npm ci` in the cloned directory
5. Make a copy of `.env.example` called `.env`, fill in the values
6. Fill in the values in `.env`
    * `DEVELOPMENT_GUILD_ID` is the ID of the server you invited the bot to in step 2
7. Run `npm run watch` to run the bot and watch for file changes

#### Invite link
Use the following link to invite the bot. Replace `[CLIENT_ID]` with your application's client ID.
```
https://discord.com/api/oauth2/authorize?client_id=[CLIENT_ID]&permissions=0&scope=bot%20applications.commands
```

### Building for production
1. Run `npm run build`
2. To start the bot, run `npm start`
