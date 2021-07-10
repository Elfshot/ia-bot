import { Command, Listener } from 'discord-akairo';
import { Message } from 'discord.js';

export default class CommandBlockedListener extends Listener {
  constructor() {
    super('commandBlocked', {
      emitter: 'commandHandler',
      event: 'commandBlocked'
    });
  }

  exec(message: Message, command: Command, reason: string): any {
    console.log(`${message.author.username} command was blocked. cmd: ${command.id} for ${reason}`);
  }
}