import { ChannelType, PermissionsBitField } from 'discord.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Définir le chemin vers le fichier de configuration et charger les informations nécessaires
const configPath = 'config.json';
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const twitchUsername = config.socials.twitch;
const tiktokUsername = config.socials.tiktok;
const updateInterval = 10 * 60 * 1000; // 10 minutes en millisecondes

// Chemin vers le fichier JSON pour sauvegarder les informations des salons
const dataFilePath = path.resolve('./data/counters.json');

// Fonction pour charger les données depuis le fichier JSON
function loadChannelData() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const rawData = fs.readFileSync(dataFilePath);
      return JSON.parse(rawData);
    } else {
      return {
        memberCounterChannelId: null,
        twitchFollowerCounterChannelId: null,
        tiktokFollowerCounterChannelId: null,
        categoryId: null,
        countersActive: false,
      };
    }
  } catch (error) {
    console.error('Erreur lors du chargement des données JSON:', error);
    return {
      memberCounterChannelId: null,
      twitchFollowerCounterChannelId: null,
      tiktokFollowerCounterChannelId: null,
      categoryId: null,
      countersActive: false,
    };
  }
}

// Fonction pour sauvegarder les données dans le fichier JSON
function saveChannelData(data) {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(dataFilePath, jsonData);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données JSON:', error);
  }
}

// Fonction pour obtenir les followers Twitch
async function getTwitchFollowers(channelName) {
  try {
    const userInfos = await fetch(
      `https://api.twitch.tv/helix/users?login=${channelName}`,
      {
        headers: {
          'Client-Id': config.twitch.clientId,
          Authorization: `Bearer ${config.twitch.oauth}`,
        },
      },
    );

    const userInfosData = await userInfos.json();

    if (!userInfosData.data[0].id) {
      console.error(
        "Erreur lors de la récupération des informations de l'utilisateur Twitch",
      );
      return null;
    }

    const followers = await fetch(
      `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userInfosData.data[0].id}`,
      {
        headers: {
          'Client-Id': config.twitch.clientId,
          Authorization: `Bearer ${config.twitch.oauth}`,
        },
      },
    );

    const followersData = await followers.json();

    if (!followersData.total) {
      console.error('Erreur lors de la récupération des followers Twitch');
      return null;
    }

    return followersData.total;

    return null;
  } catch (error) {
    console.error('Error fetching Twitch API:', error);
    return null;
  }
}

async function getTiktokFollowers(username) {
  return 0;
}

// Fonction pour recréer la catégorie et les salons (appelée si les salons ou la catégorie n'existent pas)
async function recreateChannels(guild) {
  let channelData = loadChannelData();

  // Supprimer l'ancienne catégorie si elle existe
  if (channelData.categoryId) {
    const oldCategory = guild.channels.cache.get(channelData.categoryId);
    if (oldCategory) {
      console.log(`Suppression de l'ancienne catégorie: ${oldCategory.id}`);
      await oldCategory.delete();
    }
  }

  // Créer une nouvelle catégorie
  console.log('Création de la nouvelle catégorie...');
  const category = await guild.channels.create({
    name: '📈 - Statistiques',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.Connect],
      },
    ],
  });

  // Positionner la catégorie en haut de la liste
  await category.setPosition(0);
  console.log(`Catégorie créée avec succès: ${category.id}`);

  // Créer le channel pour le nombre de membres
  console.log('Création du channel pour le nombre de membres...');
  const memberCounterChannel = await guild.channels.create({
    name: '👪┋Membres : 0',
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.Connect],
      },
    ],
  });

  // Créer le channel pour le nombre de followers Twitch
  console.log('Création du channel pour le nombre de followers Twitch...');
  const twitchFollowerCounterChannel = await guild.channels.create({
    name: '🟣┋Twitch : 0',
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.Connect],
      },
    ],
  });

  // Créer le channel pour le nombre de followers TikTok
  console.log('Création du channel pour le nombre de followers TikTok...');
  const tiktokFollowerCounterChannel = await guild.channels.create({
    name: '📱┋TikTok : 0',
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.Connect],
      },
    ],
  });

  // Sauvegarder les nouveaux identifiants dans le fichier JSON
  channelData = {
    memberCounterChannelId: memberCounterChannel.id,
    twitchFollowerCounterChannelId: twitchFollowerCounterChannel.id,
    tiktokFollowerCounterChannelId: tiktokFollowerCounterChannel.id,
    categoryId: category.id,
    countersActive: true,
  };
  saveChannelData(channelData);

  return {
    memberCounterChannel,
    twitchFollowerCounterChannel,
    tiktokFollowerCounterChannel,
    category,
  };
}

// Fonction pour mettre à jour les compteurs existants
async function updateCounters(guild) {
  let channelData = loadChannelData();

  const memberCounterChannel = guild.channels.cache.get(
    channelData.memberCounterChannelId,
  );

  const twitchFollowerCounterChannel = guild.channels.cache.get(
    channelData.twitchFollowerCounterChannelId,
  );

  const tiktokFollowerCounterChannel = guild.channels.cache.get(
    channelData.tiktokFollowerCounterChannelId,
  );

  if (
    !memberCounterChannel ||
    !twitchFollowerCounterChannel ||
    !tiktokFollowerCounterChannel
  ) {
    console.error('Les salons de compteur ne sont pas disponibles.');
    return;
  }

  try {
    const memberCount = guild.memberCount;
    const twitchFollowerCount = await getTwitchFollowers(twitchUsername);
    const tiktokFollowerCount = await getTiktokFollowers(tiktokUsername);

    if (twitchFollowerCount !== null && tiktokFollowerCount !== null) {
      await memberCounterChannel.setName(`👪┋Membres : ${memberCount}`);
      await twitchFollowerCounterChannel.setName(
        `🟣┋Twitch : ${twitchFollowerCount}`,
      );
      await tiktokFollowerCounterChannel.setName(
        `📱┋TikTok : ${tiktokFollowerCount}`,
      );
    }
  } catch (error) {
    console.error('Échec de la mise à jour des compteurs:', error);
  }
}

// Fonction pour planifier les mises à jour des compteurs
async function scheduleUpdates(guild) {
  console.log(
    `Planification des mises à jour toutes les ${updateInterval} ms.`,
  );
  setInterval(async () => {
    await updateCounters(guild);
  }, updateInterval);
}

// Fonction principale pour gérer les commandes et le démarrage du bot
export default async function handleCounterCommand(client) {
  client.on('ready', async () => {
    const guild = client.guilds.cache.first();
    let channelData = loadChannelData();

    if (channelData.countersActive) {
      await updateCounters(guild);
      await scheduleUpdates(guild);
    } else {
      console.log('Les compteurs ne sont pas actifs.');
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const guild = interaction.guild;
    const member = interaction.member;

    if (interaction.commandName === 'setupcounters') {
      // Vérifiez si l'utilisateur a la permission de gérer les salons
      if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({
          content: "Vous n'avez pas la permission de gérer les salons.",
          ephemeral: true,
        });
      }
      console.log('Commande setupcounters reçue.');
      const {
        memberCounterChannel,
        twitchFollowerCounterChannel,
        tiktokFollowerCounterChannel,
        category,
      } = await recreateChannels(guild);

      await updateCounters(guild);

      // Mettre à jour le fichier JSON pour indiquer que les salons et la catégorie sont actifs
      let channelData = loadChannelData();
      channelData = {
        ...channelData,
        memberCounterChannelId: memberCounterChannel.id,
        twitchFollowerCounterChannelId: twitchFollowerCounterChannel.id,
        tiktokFollowerCounterChannelId: tiktokFollowerCounterChannel.id,
        categoryId: category.id,
        countersActive: true,
      };
      saveChannelData(channelData);

      // Planifier les mises à jour des compteurs après leur création
      await scheduleUpdates(guild);

      return interaction.reply({
        content: `Les compteurs et la catégorie ont été créés avec succès.`,
        ephemeral: true,
      });
    } else if (interaction.commandName === 'removecounters') {
      // Vérifiez si l'utilisateur a la permission de gérer les salons
      if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({
          content: "Vous n'avez pas la permission de gérer les salons.",
          ephemeral: true,
        });
      }
      console.log('Commande removecounters reçue.');
      await removeCounterChannels(guild);

      // Mettre à jour le fichier JSON pour indiquer que les salons et la catégorie sont supprimés
      let channelData = loadChannelData();
      channelData = {
        memberCounterChannelId: null,
        twitchFollowerCounterChannelId: null,
        tiktokFollowerCounterChannelId: null,
        categoryId: null,
        countersActive: false,
      };
      saveChannelData(channelData);

      return interaction.reply({
        content: `Les compteurs et la catégorie ont été supprimés.`,
        ephemeral: true,
      });
    }
  });
}

// Fonction pour supprimer les anciens salons et la catégorie si elle existe
async function removeCounterChannels(guild) {
  let channelData = loadChannelData();

  console.log('Suppression des anciens salons et de la catégorie...');
  // Supprimer les anciens channels et la catégorie si elle existe
  if (channelData.memberCounterChannelId) {
    const oldMemberChannel = guild.channels.cache.get(
      channelData.memberCounterChannelId,
    );
    if (oldMemberChannel) {
      console.log(`Suppression du salon membres: ${oldMemberChannel.id}`);
      await oldMemberChannel.delete();
    }
  }

  if (channelData.twitchFollowerCounterChannelId) {
    const oldFollowerChannel = guild.channels.cache.get(
      channelData.twitchFollowerCounterChannelId,
    );
    if (oldFollowerChannel) {
      console.log(`Suppression du salon followers: ${oldFollowerChannel.id}`);
      await oldFollowerChannel.delete();
    }
  }

  if (channelData.tiktokFollowerCounterChannelId) {
    const oldFollowerChannel = guild.channels.cache.get(
      channelData.tiktokFollowerCounterChannelId,
    );
    if (oldFollowerChannel) {
      console.log(`Suppression du salon followers: ${oldFollowerChannel.id}`);
      await oldFollowerChannel.delete();
    }
  }

  if (channelData.categoryId) {
    const oldCategory = guild.channels.cache.get(channelData.categoryId);
    if (oldCategory) {
      console.log(`Suppression de la catégorie: ${oldCategory.id}`);
      await oldCategory.delete();
    }
  }

  // Mettre à jour le fichier JSON pour indiquer que les salons et la catégorie ont été supprimés
  channelData = {
    memberCounterChannelId: null,
    twitchFollowerCounterChannelId: null,
    tiktokFollowerCounterChannelId: null,
    categoryId: null,
    countersActive: false,
  };
  saveChannelData(channelData);
}
