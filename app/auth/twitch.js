import axios from 'axios';
import fs from 'fs';

// Définir le chemin vers le fichier de configuration et charger les informations nécessaires
const configPath = 'config.json';
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

/**
 * Fonction pour obtenir un token OAuth de Twitch
 * et mettre à jour le fichier config.json avec le nouveau token.
 *
 * @returns {Promise<string>} Le token OAuth de Twitch.
 */
async function getTwitchOAuthToken() {
  try {
    const { clientId, clientSecret } = config.twitch;

    // Faire une requête POST pour obtenir un nouveau token OAuth
    const response = await axios.post(
      'https://id.twitch.tv/oauth2/token',
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    // Récupérer le token depuis la réponse
    const token = response.data.access_token;

    // Mettre à jour le fichier JSON avec le nouveau token
    config.twitch.oauth = token;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log('Token OAuth (twitch) mis à jour avec succès.');

    // Retourner le token pour une utilisation ultérieure
    return token;
  } catch (error) {
    console.error(
      'Erreur lors de la récupération du token OAuth (twitch) :',
      error.message,
    );
    throw error;
  }
}

export default getTwitchOAuthToken;
