import { Command } from 'discord-akairo';
import { Message, GuildMember, MessageEmbed } from 'discord.js';

const roles: {[roleName:string]: { id: string, reverse?: boolean, reverseRoles?: { name?: string, act?: 'add' | 'remove' | 'opposite' | 'same', 
actCondition?: 'adding' | 'removing' }[] } } = {
  // testing - 1054912819847495680 | prod - 805906643279544381
  'loa': { id: '805906643279544381', reverse: true, reverseRoles: [{ name: 'prospects', act: 'remove', actCondition: 'adding' },
    { name: 'no prospects', act: 'same' }, { name: 'more prospects', act: 'remove', actCondition: 'adding' }] },
  
  
  // testing - 1054912858808385616 | prod - 1052383387278659604
  'prospects': { id: '1052383387278659604', reverse: true, reverseRoles: [{ name: 'no prospects', act: 'opposite' }, 
    { name: 'loa', act: 'remove', actCondition: 'adding' }, { name: 'more prospects', act: 'remove', actCondition: 'removing' }] },
  
  
  // testing - 1054914569333653606 | prod - 1052383663171571802
  'no prospects': { id: '1052383663171571802', reverse: true, reverseRoles: [{ name: 'prospects', act: 'opposite' }, 
    { name: 'more prospects', act: 'remove', actCondition: 'adding' }, { name: 'loa', act: 'remove' }] },
  
  
  // testing - 1054912886079758397 | prod - 1052384904127709214
  'more prospects': { id: '1052384904127709214', reverse: true, reverseRoles: [{ name: 'no prospects', act: 'remove', actCondition: 'adding' }, 
    { name: 'prospects', act: 'add', actCondition: 'adding' }, { name: 'loa', act: 'remove', actCondition: 'adding' }] },
};

export default class PingCommand extends Command {
  constructor() {
    super('role', {
      aliases: ['role'],
      description: 'Toggle a role',
      args: [
        {
          id: 'role',
          type: 'string',
          default: null,
        },
      ],
      separator: '|',
    });
  }

  private convertAct(rule: 'add' | 'remove' | 'opposite' | 'same', status: 'added' | 'removed', condition?: 'adding' | 'removing') {
    if (condition) {
      if (condition == 'adding' && status == 'removed') return null;
      if (condition == 'removing' && status == 'added') return null;
    }
    switch (rule) {
    case 'add':
      return true;
    case 'remove':
      return false;
    case 'opposite':
      return !(status == 'added');
    case 'same':
      return (status == 'added');
    }
  }

  private async applyRoles(requestedRole: string, author: GuildMember) {
    const targetRole = roles[requestedRole];

    try {
      const roleStatus = await this.setRole(author, targetRole.id, 'toggle');
      if (!roleStatus) throw Error('Unable to toggle roles!');

      if (targetRole.reverse) {
        for (const role of targetRole.reverseRoles) {
          const action = this.convertAct(role.act, roleStatus, role.actCondition);
          console.log(`For role ${role.name}- ${action}`);
          if (action == null) continue;
          await this.setRole(author, roles[role.name].id, action? 'add': 'remove');
        }
      }
    } catch(e) {
      console.error(`Failed to give role:\n${e}`);
      throw Error(e as string);
    }
  }

  private async setRole(member: GuildMember, roleId: string, action: 'toggle' | 'add' | 'remove') {
    const roleName = Object.entries(roles).find((val) => { return val[1].id == roleId; })?.[0];    
    try {
    
      const toRemove = action == 'toggle'? member.roles.cache.has(roleId) : action == 'add'? false: true;

      if (toRemove) {
        await member.roles.remove(roleId);
        console.log(`Removed role ${roleName} | ${roleId} from ${member.displayName} | ${member.id}`);
        return 'removed';
      } else {
        await member.roles.add(roleId);
        console.log(`Added role ${roleName} | ${roleId} to ${member.displayName} | ${member.id}`);
        return 'added';
      }
    } catch (err) {
      console.error(`Unable to toggle role for user ${member.id} for reason:\n${err}`);
      throw Error(err as string);
    }
    return null;
  }

  async exec(msg: Message, args: { role: string }): Promise<any> {
    try {
      const role = args.role;
      const requestedRole = role?.toLowerCase()?.normalize()?.trim();
      if (!role || !Object.keys(roles).includes(requestedRole)) {
        return await msg.reply('No target role provided- choose from:', { embed: new MessageEmbed({
          title: 'Options',
          description: '**LOA**: Go on extended leave\n**Prospects**: Take a trainee here and there\n**No Prospects**: Busy but not on leave\n**MORE PROSPECTS**: You like being a passenger princess'
        }) });
      }
      await this.applyRoles(requestedRole, await msg.guild.members.fetch(msg.author.id));
    } catch(e) {
      console.error(`Role command failed with the response:\n ${e}`);
      return await msg.reply(`Command failed with the response:\n ${e}`);
    }
    return await msg.react('🪄');
  }
}