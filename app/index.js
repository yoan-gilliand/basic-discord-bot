import { Client, GatewayIntentBits } from 'discord.js';
import config from './config.json' assert { type: 'json' };
import registerCommands from './services/registerSlashCommands.js';
import handleWelcome from './features/welcome.js';
import handlePunishCommand from './features/punish.js';

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
    await registerCommands(); // Enregistrement des commandes slash
  });

  // Démarrage de la gestion des nouveaux membres
  handleWelcome(client);

  // Démarrage de la gestion des avertissements et sanctions
  handlePunishCommand(client);

  // Connexion du bot
  client.login(config.bot.token);
}
// Démarrer le bot
startBot();
