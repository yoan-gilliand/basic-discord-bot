import { PermissionsBitField, EmbedBuilder } from 'discord.js';
import fs from 'fs';

/**
 * Gère la commande /punish pour infliger des sanctions aux membres d'un serveur Discord.
 * Cette commande ajoute des rôles d'avertissement ou bannit un membre en fonction des rôles actuels.
 * Un message éphémère est envoyé à l'utilisateur qui exécute la commande, et un embed est envoyé dans un canal spécifié.
 *
 * @param {import('discord.js').Client} client - Le client Discord à partir duquel l'interaction est gérée.
 */
export default function handlePunishCommand(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    if (commandName === 'punish') {
      const member = options.getMember('user');
      const reason = options.getString('reason') || 'Aucune raison spécifiée';
      const punishChannel = client.channels.cache.get(
        config.channels.moderationActions,
      );

      if (!member) {
        return interaction.reply({
          content: 'Utilisateur non trouvé.',
          ephemeral: true,
        });
      }

      if (member.user.bot) {
        return interaction.reply({
          content: 'Vous ne pouvez pas punir un bot.',
          ephemeral: true,
        });
      }

      // Vérification des permissions de l'utilisateur qui exécute la commande
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.KickMembers,
        ) ||
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.BanMembers,
        )
      ) {
        return interaction.reply({
          content:
            "Vous n'avez pas la permission d'expulser ou de bannir des membres.",
          ephemeral: true,
        });
      }

      let punishment = '';

      // Vérifier quel rôle l'utilisateur a déjà
      if (
        !member.roles.cache.has(config.roles.warn1) &&
        !member.roles.cache.has(config.roles.warn2)
      ) {
        // Si l'utilisateur n'a aucun avertissement, ajouter le premier avertissement
        await member.roles.add(config.roles.warn1);
        punishment = 'Premier avertissement (Warn 1)';
        interaction.reply({
          content: `${member.displayName} a été averti.`,
          ephemeral: true,
        });
      } else if (
        member.roles.cache.has(config.roles.warn1) &&
        !member.roles.cache.has(config.roles.warn2)
      ) {
        // Si l'utilisateur a le premier avertissement, ajouter le deuxième avertissement
        await member.roles.add(config.roles.warn2);
        punishment = 'Deuxième avertissement (Warn 2)';
        interaction.reply({
          content: `${member.displayName} a reçu un deuxième avertissement.`,
          ephemeral: true,
        });
      } else if (member.roles.cache.has(config.roles.warn2)) {
        // Si l'utilisateur a déjà les deux avertissements, le bannir
        await member.ban({ reason });
        punishment = 'Bannissement';
        interaction.reply({
          content: `${member.displayName} a été banni.`,
          ephemeral: true,
        });
      }

      // Envoyer un embed dans le canal des punitions
      if (punishChannel) {
        const embed = new EmbedBuilder()
          .setColor('#e34242')
          .setTitle('Action de modération')
          .addFields(
            {
              name: 'Membre sanctionné',
              value: `${member.displayName} (${member.user.tag})`,
              inline: true,
            },
            { name: 'Sanction', value: punishment, inline: true },
            {
              name: 'Modérateur',
              value: `${interaction.user.tag}`,
              inline: true,
            },
            { name: 'Raison', value: reason, inline: false },
          )
          .setTimestamp()
          .setFooter({ text: 'Système de punitions' });

        await punishChannel.send({ embeds: [embed] });
      }
    }
  });
}
