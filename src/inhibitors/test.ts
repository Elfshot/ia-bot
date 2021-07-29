import { Inhibitor } from 'discord-akairo';

export default class TestInhibitor extends Inhibitor {
  constructor() {
    super('test', {
      reason: 'test'
    });
  }

  exec(): boolean {
    return false; //? if true, this message will be blocked, and the reason will be 'test'
  }
}