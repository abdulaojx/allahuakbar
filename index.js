const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config(); // Carica le variabili d'ambiente da .env

// Usa il token dal file .env
const token = process.env.TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Variabili per tenere traccia dello scrim
let scrimMessage = null;
let scrimReactions = new Map();
let scrimLink = 'https://defaultlink.com'; // Link di default

client.once('ready', () => {
    console.log('Il bot è online!');

    const guildId = 'YOUR_GUILD_ID'; // Inserisci l'ID del server se vuoi che sia solo in un server specifico
    const guild = client.guilds.cache.get(guildId);
    
    if (guild) {
        guild.commands.create({
            name: 'scrim',
            description: 'Announce a scrim and allow members to join by reacting.'
        });
        guild.commands.create({
            name: 'manage-scrim',
            description: 'Manage scrims with options.'
        });
        guild.commands.create({
            name: 'setlink',
            description: 'Set a custom link for the scrim.',
            options: [
                {
                    name: 'link',
                    type: 'STRING',
                    description: 'The link to be set for the scrim.',
                    required: true,
                },
            ],
        });
        console.log('Comandi /scrim, /manage-scrim e /setlink registrati nel server!');
    } else {
        console.log('Non ho trovato il server, i comandi non sono stati registrati.');
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'scrim') {
        const embed = new EmbedBuilder()
            .setTitle('Scrim Time!')
            .setDescription('React to this message to join the scrim!')
            .setColor('#0099ff');

        scrimMessage = await interaction.reply({ embeds: [embed], fetchReply: true });

        // Aggiunge una reazione specifica al messaggio
        await scrimMessage.react('⚔️'); // Puoi cambiare l'emoji qui

        // Resetta le reazioni memorizzate
        scrimReactions.clear();
    } 
    else if (interaction.commandName === 'manage-scrim') {
        await interaction.reply({
            content: 'Check your DMs!',
            ephemeral: true
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('manage-scrim-select')
            .setPlaceholder('Scegli un\'opzione...')
            .addOptions([
                {
                    label: 'Start',
                    value: 'start',
                    description: 'Start the scrim.',
                },
                {
                    label: 'Stop',
                    value: 'stop',
                    description: 'Stop the scrim.',
                },
                {
                    label: 'Link',
                    value: 'link',
                    description: 'Set a custom link.',
                },
            ]);

        const row = new ActionRowBuilder()
            .addComponents(selectMenu);

        const dmChannel = await interaction.user.createDM();
        await dmChannel.send({
            content: 'Manager AEL scrim!',
            components: [row]
        }).catch(err => console.error('Errore nell\'invio del DM:', err));
    }
    else if (interaction.commandName === 'setlink') {
        const newLink = interaction.options.getString('link');
        scrimLink = newLink;

        if (scrimMessage) {
            scrimMessage.edit({
                content: `Il link per lo scrim è stato aggiornato: ${scrimLink}`
            });
        }

        await interaction.reply({
            content: `Link aggiornato con successo a: ${scrimLink}`,
            ephemeral: true
        });
    }
});

// Gestione delle interazioni con i componenti
client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'manage-scrim-select') {
            const selectedOption = interaction.values[0];

            if (selectedOption === 'stop') {
                if (scrimMessage) {
                    const embed = new EmbedBuilder()
                        .setTitle('Scrim Ended')
                        .setDescription('This scrim has been ended.')
                        .setColor('#ff0000');

                    await scrimMessage.edit({ embeds: [embed] });
                    interaction.reply({
                        content: 'Lo scrim è stato terminato.',
                        ephemeral: true
                    });
                } else {
                    interaction.reply({
                        content: 'Non c\'è uno scrim attivo da terminare.',
                        ephemeral: true
                    });
                }
            } 
            else if (selectedOption === 'start') {
                if (scrimMessage) {
                    const users = Array.from(scrimReactions.values());
                    if (users.length > 0) {
                        users.forEach(async (user) => {
                            await user.send(`Lo scrim sta iniziando! Ecco il link: ${scrimLink}`);
                        });
                        interaction.reply({
                            content: 'Link inviato a tutti gli utenti che hanno reagito.',
                            ephemeral: true
                        });
                    } else {
                        interaction.reply({
                            content: 'Non ci sono utenti che hanno reagito.',
                            ephemeral: true
                        });
                    }
                } else {
                    interaction.reply({
                        content: 'Non c\'è uno scrim attivo per iniziare.',
                        ephemeral: true
                    });
                }
            }
            else if (selectedOption === 'link') {
                await interaction.reply({
                    content: 'Per favore, utilizza il comando `/setlink` per impostare un nuovo link.',
                    ephemeral: true
                });
            }
        }
    }
});

// Raccogli le reazioni degli utenti e memorizzale
client.on('messageReactionAdd', (reaction, user) => {
    if (reaction.message.id === scrimMessage?.id && !user.bot) {
        scrimReactions.set(user.id, user);
    }
});

client.login(token);
            
