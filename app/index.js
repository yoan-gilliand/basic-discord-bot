import { Client, GatewayIntentBits } from 'discord.js';
import config from './config.json' assert { type: 'json' };
import registerCommands from './services/registerSlashCommands.js';
import handleWelcome from './features/welcome.js';
import handlePunishCommand from './commands/punish.js';
import getTwitchOAuthToken from './auth/twitch.js';
import startLiveStatusCheck from './features/status.js';
import handleCounterCommand from './features/counters.js';
import handlePurgeCommand from './commands/purge.js';

async function startBot() {
  // Initialisation du client Discord
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
    ],
  });

  // Obtenir un nouveau token Twitch
  await getTwitchOAuthToken();

  // Programmer la mise à jour du token toutes les 12 heures
  setInterval(async () => {
    await getTwitchOAuthToken();
  }, 43200000);

  // Démarrage du bot
  client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await registerCommands(); // Enregistrement des commandes slash
  });

  // Démarrage de la gestion des nouveaux membres
  handleWelcome(client);

  // Démarrage de la gestion des avertissements et sanctions
  handlePunishCommand(client);

  // Démarrage de la vérification du statut du streamer
  startLiveStatusCheck(client);

  // Démarrage de la gestion des compteurs
  handleCounterCommand(client);

  // Démarrage de la commande /purge
  handlePurgeCommand(client);

  // Connexion du bot
  client.login(config.bot.token);
}
// Démarrer le bot
startBot();
