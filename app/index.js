import { Client, GatewayIntentBits } from 'discord.js';
import config from './config.json' assert { type: 'json' };
import registerCommands from './services/register.js';

async function startBot() {
    // Initialisation du client Discord
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMembers,
        ],
    });

    // Démarrage du bot
    client.on('ready', async () => {
        console.log(`Logged in as ${client.user.tag}!`);
    });

    // Connexion du bot
    client.login(config.bot.token);
}
    // Démarrer le bot
    startBot();

