async function handlePurgeCommand(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand() || interaction.commandName !== 'purge') return;

    const amount = interaction.options.getInteger('amount');

    if (amount < 1 || amount > 100) {
      return interaction.reply({
        content: 'Vous devez spécifier un nombre entre 1 et 100.',
        ephemeral: true,
      });
    }

    try {
      const deletedMessages = await interaction.channel.bulkDelete(
        amount,
        true,
      );
      return interaction.reply({
        content: `${deletedMessages.size} messages ont été supprimés.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error('Erreur lors de la suppression des messages :', error);
      return interaction.reply({
        content: 'Une erreur est survenue lors de la suppression des messages.',
        ephemeral: true,
      });
    }
  });
}

export default handlePurgeCommand;
