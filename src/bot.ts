import { join } from 'path';
import './misc/getenv';

if (!process.env.BOT_OWNERS) throw Error('Bot owners must be passed');

import { AkairoClient, CommandHandler, InhibitorHandler, ListenerHandler } from 'discord-akairo';

class BotClient extends AkairoClient {
  commandHandler: CommandHandler;
  inhibitorHandler: InhibitorHandler;
  listenerHandler: ListenerHandler;

  constructor() {
    super({
      ownerID: process.env.BOT_OWNERS.split(',')
    }, {
      disableMentions: 'everyone'
    });

    this.commandHandler = new CommandHandler(this, {
      prefix: process.env.BOT_PREFIX,
      directory: join(__dirname, 'commands')
    });
    this.commandHandler.loadAll();

    this.inhibitorHandler = new InhibitorHandler(this, {
      directory: join(__dirname, 'inhibitors')
    });
    this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
    this.inhibitorHandler.loadAll();

    this.listenerHandler = new ListenerHandler(this, {
      directory: join(__dirname, 'listeners')
    });
    this.commandHandler.useListenerHandler(this.listenerHandler);
    this.listenerHandler.setEmitters({
      commandHandler: this.commandHandler,
      inhibitorHandler: this.inhibitorHandler,
      listenerHandler: this.listenerHandler
    });
    this.listenerHandler.loadAll();
  }
}

export const client = new BotClient();
client.login(process.env.BOT_TOKEN);

