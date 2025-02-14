require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const tempChannels = new Map();

client.once('ready', () => {
    console.log(`? Bot ${client.user.tag} está online!`);

    // Verificação automática a cada 30 minutos
    setInterval(async () => {
        console.log(`? Verificando canais temporários...`);
        for (const [userId, channelId] of tempChannels.entries()) {
            const channel = client.channels.cache.get(channelId);
            if (channel && channel.members.size === 0) {
                try {
                    await channel.delete();
                    tempChannels.delete(userId);
                    console.log(`??? Canal (${channel.name}) deletado por inatividade.`);
                } catch (error) {
                    console.error(`? Erro ao excluir canal: ${error.message}`);
                }
            }
        }
    }, 30 * 60 * 1000); // 30 minutos
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    console.log(`?? Evento detectado: ${newState.member?.user.username || 'Desconhecido'} entrou/saiu de um canal`);

    const tempVoiceChannelId = process.env.TEMP_VOICE_CHANNEL_ID;

    if (newState.channelId === tempVoiceChannelId) {
        console.log(`?? ${newState.member.user.username} entrou no canal mestre.`);

        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        const user = newState.member;

        try {
            const newChannel = await guild.channels.create({
                name: `Canal de ${user.displayName}`,
                type: 2,
                parent: newState.channel.parent,
                permissionOverwrites: [
                    { id: user.id, allow: ['Connect', 'ManageChannels'] }
                ]
            });

            tempChannels.set(user.id, newChannel.id);
            await user.voice.setChannel(newChannel);
            console.log(`? Canal criado para ${user.user.username}`);
        } catch (error) {
            console.error(`? Erro ao criar canal: ${error.message}`);
        }
    }

    if (oldState.channel && tempChannels.has(oldState.member.id)) {
        const tempChannelId = tempChannels.get(oldState.member.id);
        const tempChannel = oldState.guild.channels.cache.get(tempChannelId);

        if (tempChannel && tempChannel.members.size === 0) {
            try {
                await tempChannel.delete();
                tempChannels.delete(oldState.member.id);
                console.log(`??? Canal deletado para ${oldState.member.user.username}`);
            } catch (error) {
                console.error(`? Erro ao excluir canal: ${error.message}`);
            }
        }
    }
});

client.login(process.env.TOKEN);
