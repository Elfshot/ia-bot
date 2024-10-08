import { Command } from 'discord-akairo';
import { Message } from 'discord.js';

export default class PingCommand extends Command {
  constructor() {
    super('ping', {
      aliases: ['ping'],
      description: 'Ping Pong',
    });
  }

  exec(msg: Message): Promise<Message> {
    return msg.reply('pong!');
  }
}