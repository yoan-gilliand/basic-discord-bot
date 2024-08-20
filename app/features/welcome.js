import { createCanvas, loadImage } from 'canvas';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';

/**
 * Fonction pour gérer l'arrivée d'un nouveau membre sur le serveur.
 * @param client
 */
export default function handleWelcome(client) {
  client.on('guildMemberAdd', async (member) => {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

    const width = 700;
    const height = 250;

    // Création d'un canvas
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');

    try {
      // Forcer le format PNG pour l'avatar
      const avatar = await loadImage(
        member.user.displayAvatarURL({ extension: 'png', size: 1024 }),
      );

      // Fond de l'image
      context.fillStyle = '#2b2d31';
      context.fillRect(0, 0, width, height);

      // Dessiner l'avatar en cercle
      const avatarSize = 200;
      const avatarX = 25;
      const avatarY = 25;
      context.save();
      context.beginPath();
      context.arc(
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2,
        avatarSize / 2,
        0,
        Math.PI * 2,
        true,
      );
      context.closePath();
      context.clip();

      // Dessin de l'avatar
      context.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);

      // Rétablir le contexte pour les éléments suivants
      context.restore();

      // Texte "Bienvenue"
      context.fillStyle = '#FFFFFF';
      context.font = 'bold 70px Anton SC, sans-serif';
      context.fillText('Bienvenue', 250, 100);

      // Texte "Bienvenue"
      context.fillStyle = '#FFFFFF';
      context.font = 'bold 30px Anton SC, sans-serif';
      context.fillText('sur le serveur Discord', 250, 140);

      // Nom du serveur
      context.font = 'bold 50px Anton SC, sans-serif';
      context.fillStyle = '#FFFFFF';
      context.fillText(member.guild.name, 250, 200);

      // Convertir le canvas en buffer et créer un attachement
      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, {
        name: 'welcome-image.png',
      });

      // Créer un embed de bienvenue
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#E34242')
        .setTitle('Ho ! Un nouveau membre !')
        .setDescription(`🎉 Bienvenue **${member.user.tag}** 🎉`)
        .setImage('attachment://welcome-image.png')
        .setTimestamp();

      // Envoyer l'embed dans le channel de bienvenue avec l'image
      const welcomeChannel = member.guild.channels.cache.get(
        config.channels.welcome,
      );
      if (welcomeChannel) {
        welcomeChannel.send({ embeds: [welcomeEmbed], files: [attachment] });
      } else {
        console.error("Le canal de bienvenue n'a pas été trouvé.");
      }
    } catch (error) {
      console.error(
        "Erreur lors de la génération de l'image de bienvenue :",
        error,
      );
    }

    // Attribuer automatiquement le rôle à l'utilisateur
    const role = member.guild.roles.cache.get(config.roles.user);
    if (role) {
      try {
        await member.roles.add(role);
        console.log(
          `Le rôle ${role.name} a été attribué à ${member.user.tag}.`,
        );
      } catch (error) {
        console.error(`Erreur lors de l'attribution du rôle : ${error}`);
      }
    } else {
      console.error("Le rôle utilisateur n'a pas été trouvé.");
    }
  });
}
