import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { client } from '../bot';
export default class PingCommand extends Command {
  constructor() {
    super('kill', {
      aliases: ['kill'],
      description: 'The bot process will be exited. [Owner only]',
      ownerOnly: true,
    });
  }

  exec(msg: Message): void {
    msg.reply('Shutting down!');
    client.destroy();
    console.log(`Bot shutdown by ${msg.author.id}`);
    process.exit(0);
  }
}