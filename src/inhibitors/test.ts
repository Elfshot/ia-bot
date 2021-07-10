import { Inhibitor } from 'discord-akairo';
import { Message } from 'discord.js';

export default class TestInhibitor extends Inhibitor {
  constructor() {
    super('test', {
      reason: 'test'
    });
  }

  exec(msg: Message): boolean {
    return false; //? if true, this message will be blocked, and the reason will be 'test'
  }
}