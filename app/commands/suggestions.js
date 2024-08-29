import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionType,
} from 'discord.js';
import fs from 'fs';
import path from 'path';

// Définir le chemin vers le fichier JSON qui stocke les suggestions
const suggestionsFilePath = path.join(
  process.cwd(),
  'data',
  'suggestions.json',
);

// Définir le chemin vers le fichier de configuration et charger les informations nécessaires
const configPath = 'config.json';
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

/**
 * Charger les suggestions depuis le fichier JSON.
 * @returns {Object} Les suggestions chargées.
 */
function loadSuggestions() {
  if (!fs.existsSync(suggestionsFilePath)) {
    return {}; // Retourne un objet vide si le fichier n'existe pas
  }
  const data = fs.readFileSync(suggestionsFilePath, 'utf8');
  return JSON.parse(data);
}

/**
 * Sauvegarder les suggestions dans le fichier JSON.
 * @param {Object} suggestions - Les suggestions à sauvegarder.
 */
function saveSuggestions(suggestions) {
  fs.writeFileSync(suggestionsFilePath, JSON.stringify(suggestions, null, 2));
}

/**
 * Envoyer un message d'explication pour les suggestions.
 * @param {Channel} channel - Le channel où envoyer le message d'explication.
 * @returns {Promise<Message>} Le message d'explication envoyé.
 */
async function sendExplanationEmbed(channel) {
  const embed = new EmbedBuilder()
    .setColor(0x00ae86)
    .setTitle('Toi aussi tu veux faire une suggestion ?')
    .setDescription(
      'Utilise la commande `/suggestion` ! Entre un titre et une description, puis soumets ton idée.',
    )
    .setTimestamp();

  const newMessage = await channel.send({ embeds: [embed] });

  // Charger les suggestions pour mettre à jour l'ID du message d'explication
  const suggestions = loadSuggestions();
  suggestions.explanationMessageId = newMessage.id;
  saveSuggestions(suggestions);

  return newMessage;
}

/**
 * Gérer les interactions de suggestion du bot.
 * @param {Client} client - Le client Discord.
 */
export default function handleSuggestionInteraction(client) {
  // Charger les suggestions depuis le fichier JSON au démarrage
  client.voteCounts = loadSuggestions();

  client.on('interactionCreate', async (interaction) => {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Gérer les commandes slash (Chat Input Commands)
      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === 'suggestion'
      ) {
        // Vérifier si l'interaction a lieu dans le bon channel
        if (interaction.channelId !== config.channels.suggestions) {
          return await interaction.reply({
            content: `Veuillez utiliser cette commande dans le salon <#${config.channels.suggestions}>.`,
            ephemeral: true,
          });
        }

        // Crée un modal pour entrer le titre et la description de la suggestion
        const modal = new ModalBuilder()
          .setCustomId('suggestionModal')
          .setTitle('Envoyer une suggestion');

        const titleInput = new TextInputBuilder()
          .setCustomId('titleInput')
          .setLabel('Titre')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const descriptionInput = new TextInputBuilder()
          .setCustomId('descriptionInput')
          .setLabel('Description')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const titleRow = new ActionRowBuilder().addComponents(titleInput);
        const descriptionRow = new ActionRowBuilder().addComponents(
          descriptionInput,
        );
        modal.addComponents(titleRow, descriptionRow);

        await interaction.showModal(modal);
      }
      // Gérer la soumission du modal
      else if (
        interaction.type === InteractionType.ModalSubmit &&
        interaction.customId === 'suggestionModal'
      ) {
        const title = interaction.fields.getTextInputValue('titleInput');
        const description =
          interaction.fields.getTextInputValue('descriptionInput');

        const embed = new EmbedBuilder()
          .setAuthor({
            name: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTitle(title)
          .setDescription(description)
          .setColor(0x00ae86)
          .setTimestamp();

        const upvoteButton = new ButtonBuilder()
          .setCustomId('upvote')
          .setLabel('👍 0')
          .setStyle(ButtonStyle.Success);

        const downvoteButton = new ButtonBuilder()
          .setCustomId('downvote')
          .setLabel('👎 0')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(
          upvoteButton,
          downvoteButton,
        );

        // Supprimer l'ancien message d'explication s'il existe
        const suggestions = loadSuggestions();
        if (suggestions.explanationMessageId) {
          try {
            const oldMessage = await interaction.channel.messages.fetch(
              suggestions.explanationMessageId,
            );
            await oldMessage.delete();
          } catch (err) {
            console.error(
              "Impossible de supprimer l'ancien message d'explication : ",
              err,
            );
          }
        }

        const message = await interaction.reply({
          embeds: [embed],
          components: [row],
          fetchReply: true,
        });

        // Enregistrer la suggestion dans le fichier JSON
        client.voteCounts[message.id] = {
          title,
          description,
          author: {
            name: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL(),
          },
          upvotes: 0,
          downvotes: 0,
          voters: [],
        };
        saveSuggestions(client.voteCounts);

        // Envoyer un nouveau message d'explication
        await sendExplanationEmbed(interaction.channel);
      }
      // Gérer les interactions avec les boutons
      else if (interaction.isButton()) {
        const message = interaction.message;
        const voteCounts = client.voteCounts[message.id];

        if (!voteCounts) return;

        // Empêcher le double vote
        if (voteCounts.voters.includes(interaction.user.id)) {
          return await interaction.reply({
            content: 'Vous avez déjà voté pour cette suggestion.',
            ephemeral: true,
          });
        }

        // Ajoute l'utilisateur à la liste des votants et met à jour les votes
        voteCounts.voters.push(interaction.user.id);
        if (interaction.customId === 'upvote') {
          voteCounts.upvotes += 1;
        } else if (interaction.customId === 'downvote') {
          voteCounts.downvotes += 1;
        }

        // Met à jour les boutons avec les nouveaux nombres de votes
        const updatedUpvoteButton = new ButtonBuilder()
          .setCustomId('upvote')
          .setLabel(`👍 ${voteCounts.upvotes}`)
          .setStyle(ButtonStyle.Success);

        const updatedDownvoteButton = new ButtonBuilder()
          .setCustomId('downvote')
          .setLabel(`👎 ${voteCounts.downvotes}`)
          .setStyle(ButtonStyle.Danger);

        const updatedRow = new ActionRowBuilder().addComponents(
          updatedUpvoteButton,
          updatedDownvoteButton,
        );

        const updatedEmbed = EmbedBuilder.from(message.embeds[0])
          .setDescription(voteCounts.description)
          .setTitle(voteCounts.title)
          .setAuthor(voteCounts.author);

        // Met à jour l'interaction avec les nouvelles valeurs
        await interaction.update({
          embeds: [updatedEmbed],
          components: [updatedRow],
        });

        // Sauvegarder les votes mis à jour
        saveSuggestions(client.voteCounts);
      }
    } catch (error) {
      console.error('Error handling interaction:', error);
      const errorMessage =
        'Il y a eu une erreur lors du traitement de cette interaction.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  });
}
