import { REST, Routes } from 'discord.js';
import fs from 'fs';

const configPath = 'config.json';
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Définition des commandes
const commands = [
  {
    name: 'suggestion',
    description: 'Envoyer une suggestion au serveur',
  },
  {
    name: 'setupcounters',
    description: 'Configurer les compteurs pour les membres et les followers',
  },
  {
    name: 'removecounters',
    description: 'Supprimer les compteurs de membres et de followers',
  },
  {
    name: 'punish',
    description:
      'Punir un membre du serveur (Avertissement 1, Avertissement 2, Bannisement)',
    options: [
      {
        name: 'user',
        type: 6,
        description: "L'utilisateur à punir",
        required: true,
      },
      {
        name: 'reason',
        type: 3,
        description: 'La raison de la punition',
        required: true,
      },
    ],
  },
  {
    name: 'purge',
    description:
      'Supprime un nombre de messages spécifié dans le canal actuel (maximum : 100 messages)',
    options: [
      {
        name: 'amount',
        type: 4,
        description: 'Le nombre de messages à supprimer',
        required: true,
      },
    ],
  },
];

// Fonction pour enregistrer les commandes
const registerCommands = async () => {
  const rest = new REST({ version: '10' }).setToken(config.bot.token);

  try {
    await rest.put(
      Routes.applicationGuildCommands(config.bot.clientId, config.bot.guildId),
      { body: commands },
    );
  } catch (error) {
    console.error('Error while reloading commands:', error);
  }
};

export default registerCommands;
