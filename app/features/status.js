import { TextChannel, EmbedBuilder, ActivityType } from 'discord.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Définir le chemin vers le fichier de configuration et charger les informations nécessaires
const configPath = 'config.json';
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Définir le chemin vers le fichier JSON pour sauvegarder le statut du stream
const statusFilePath = path.resolve('./data/status.json');

// Charger l'état initial du stream à partir du fichier JSON
let isLive = loadInitialStatus();

// Définir l'intervalle de temps entre chaque vérification du statut en millisecondes (ici 10 secondes)
const checkInterval = 10 * 1000;

/**
 * Fonction pour charger l'état initial du stream à partir du fichier JSON.
 * Si le fichier n'existe pas ou si une erreur survient, on suppose que le streamer n'est pas en live.
 * @returns {boolean} - L'état initial (true si en live, false sinon)
 */
function loadInitialStatus() {
  try {
    const data = fs.readFileSync(statusFilePath, 'utf8');
    const json = JSON.parse(data);
    return json.isLive;
  } catch (error) {
    return false;
  }
}

/**
 * Fonction pour sauvegarder l'état actuel du stream dans le fichier JSON.
 * @param {boolean} isLive - Le statut actuel (true si en live, false sinon)
 */
function saveStatus(isLive) {
  const data = JSON.stringify({ isLive }, null, 2);
  fs.writeFileSync(statusFilePath, data, 'utf8');
}

/**
 * Fonction pour vérifier si le streamer est en live via l'API Twitch Helix.
 * @returns {Promise<Object|null>} - Les données du stream si le streamer est en live, sinon null
 */
async function checkIfLive() {
  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${config.socials.twitch}`,
      {
        headers: {
          'Client-Id': config.twitch.clientId,
          Authorization: `Bearer ${config.twitch.oauth}`,
        },
      },
    );

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      console.log('Streamer is live:', data.data[0]);
      return data.data[0]; // Retourne les données du stream si le streamer est en live
    }

    return null;
  } catch (error) {
    console.error('Error fetching Twitch API:', error);
    return null;
  }
}

/**
 * Fonction pour mettre à jour l'activité du bot en fonction du statut du streamer.
 * Si le streamer est en live, le bot affiche le titre du stream en tant qu'activité "streaming".
 * Sinon, le bot affiche des informations sur les réseaux sociaux en tant qu'activité "watching".
 * @param client
 * @returns {Promise<void>}
 */
async function updateActivity(client) {
  if (isLive) {
    const streamData = await checkIfLive();
    if (streamData) {
      client.user.setActivity(`${streamData.title}`, {
        type: ActivityType.Streaming,
        url: `https://twitch.tv/${config.socials.twitch}`,
      });
    }
  } else {
    const activities = [
      `Instagram : ${config.socials.instagram}`,
      `TikTok : ${config.socials.tiktok}`,
      `Twitch : ${config.socials.twitch}`,
      `Twitter : ${config.socials.twitter}`,
      `YouTube : ${config.socials.youtube}`,
    ];
    let index = 0;
    setInterval(() => {
      client.user.setActivity(activities[index], {
        type: ActivityType.Watching,
      });
      index = (index + 1) % activities.length;
    }, 10 * 1000);
  }
}

/**
 * Fonction pour récupérer l'image du jeu via l'API Twitch Helix.
 * @param {string} gameId - L'ID du jeu dont on veut récupérer l'image.
 * @returns {Promise<string|null>} - L'URL de l'image du jeu si trouvée, sinon null.
 */
async function getGameImage(gameId) {
  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/games?id=${gameId}`,
      {
        headers: {
          'Client-Id': config.twitch.clientId,
          Authorization: `Bearer ${config.twitch.oauth}`,
        },
      },
    );

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      return data.data[0].box_art_url
        .replace('{width}', '285')
        .replace('{height}', '380');
    }

    return null;
  } catch (error) {
    console.error('Error fetching Twitch API for game image:', error);
    return null;
  }
}

/**
 * Fonction pour vérifier le statut du stream et envoyer des notifications sur Discord.
 * @param {Object} client - Le client Discord
 */
async function checkLiveStatus(client) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const channel = client.channels.cache.get(config.channels.twitchPings);
  if (!channel || !(channel instanceof TextChannel)) {
    return;
  }

  const streamData = await checkIfLive();

  await updateActivity(client);

  if (streamData && !isLive) {
    // Le streamer vient de passer en live
    isLive = true;
    saveStatus(isLive); // Sauvegarder le nouvel état

    // Récupérer l'image du jeu
    const gameImageUrl = await getGameImage(streamData.game_id);

    // Créer un embed pour le lancement du stream
    const embed = new EmbedBuilder()
      .setColor(0xfb4c4b) // Couleur rouge (#fb4c4b)
      .setTitle(streamData.title)
      .setURL(`https://twitch.tv/${config.socials.twitch}`) // Lien cliquable vers le stream
      .addFields(
        { name: 'Catégorie', value: streamData.game_name, inline: true },
        {
          name: 'Spectateurs actuels',
          value: streamData.viewer_count.toString(),
          inline: true,
        },
      )
      .setImage(
        `https://static-cdn.jtvnw.net/previews-ttv/live_user_${config.socials.twitch.toLowerCase()}-640x360.jpg`,
      )
      .setThumbnail(gameImageUrl) // Ajouter la miniature du jeu
      .setTimestamp(); // Ajoute l'heure actuelle au bas de l'embed

    await channel.send({
      content: `Le stream est lancé @everyone https://twitch.tv/${config.socials.twitch} !`,
      embeds: [embed],
    });
  } else if (!streamData && isLive) {
    // Le streamer vient de couper son stream
    isLive = false;
    saveStatus(isLive); // Sauvegarder le nouvel état

    // Envoyer un message embed avec les liens supplémentaires
    const embed = new EmbedBuilder()
      .setColor(0xfb4c4b) // Couleur rouge (#fb4c4b)
      .setTitle('Le stream est terminé !')
      .setDescription(
        `**Néanmoins, vous pouvez aller consulter la dernière rediff !**\n[👉 Cliquez ici pour accéder à la chaîne Twitch](https://twitch.tv/${config.socials.twitch})\n\n**Sinon, allez consulter les meilleurs moments de mes streams sur TikTok !**\n[👉 Cliquez ici pour accéder à la chaîne TikTok](https://www.tiktok.com/@${config.socials.tiktok})`,
      )
      .setTimestamp(); // Ajoute l'heure actuelle au bas de l'embed

    await channel.send({ embeds: [embed] });
  }
}

/**
 * Fonction principale pour démarrer la vérification du statut à intervalles réguliers.
 * @param {Object} client - Le client Discord
 */
export default function startLiveStatusCheck(client) {
  client.on('ready', () => {
    // Démarrer la vérification à intervalles réguliers
    setInterval(() => checkLiveStatus(client), checkInterval);
  });
}
