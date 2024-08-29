import { REST, Routes } from 'discord.js';
import config from '../config.json' assert { type: 'json' };

// Définition des commandes
const commands = [
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
