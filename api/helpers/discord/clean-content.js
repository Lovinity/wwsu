module.exports = {
  friendlyName: "Clean content",

  description:
    "Temporary utility. TODO: use Discord.js when this pushes to stable.",

  inputs: {
    str: {
      type: "string",
      required: true,
      description: "The message to filter"
    },
    channel: {
      type: "ref",
      required: true,
      description: "The channel sent or intended to be sent to"
    }
  },

  fn: async function(inputs) {
    inputs.str = inputs.str
      .replace(/<@!?[0-9]+>/g, input => {
        const id = input.replace(/<|!|>|@/g, "");
        if (inputs.channel.type === "dm") {
          const user = inputs.channel.client.users.cache.get(id);
          return user
            ? Discord.Util.removeMentions(`@${user.username}`)
            : input;
        }

        const member = inputs.channel.guild.members.cache.get(id);
        if (member) {
          return Discord.Util.removeMentions(`@${member.displayName}`);
        } else {
          const user = inputs.channel.client.users.cache.get(id);
          return user
            ? Discord.Util.removeMentions(`@${user.username}`)
            : input;
        }
      })
      .replace(/<#[0-9]+>/g, input => {
        const mentionedChannel = inputs.channel.client.channels.cache.get(
          input.replace(/<|#|>/g, "")
        );
        return mentionedChannel ? `#${mentionedinputs.channel.name}` : input;
      })
      .replace(/<@&[0-9]+>/g, input => {
        if (inputs.channel.type === "dm") return input;
        const role = inputs.channel.guild.roles.cache.get(
          input.replace(/<|@|>|&/g, "")
        );
        return role ? `@${role.name}` : input;
      });
    return inputs.str;
  }
};
