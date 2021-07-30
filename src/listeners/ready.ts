import { Listener } from 'discord-akairo';

export default class ReadyListener extends Listener {
  constructor() {
    super('ready', {
      emitter: 'client',
      event: 'ready'
    });
  }

  exec(): any {
    console.log(`Logged in as ${this.client.user.username}#${this.client.user.discriminator}`);
    this.client.user.setActivity({ type: 'PLAYING', name: 'With vouchers.' });
  }
}