import Tomon from 'tomon-sdk'
import { App, Server, Session } from 'koishi-core'
import { TomonBot } from './bot'
import { camelize } from 'koishi-utils'

export * from './bot'

declare module 'koishi-core/dist/server' {
  interface BotOptions {
    token?: string
  }
}

declare module 'koishi-core/dist/session' {
  interface Session {
    channelId?: string
  }
}

Server.types.tomon = class TomonServer extends Server<TomonBot> {
  constructor(app: App) {
    super(app, TomonBot)
  }

  async _listen(bot: TomonBot) {
    const tomon = bot.tomon = new Tomon()
    await tomon.start(bot.token)
    bot.ready = true
    const selfId = bot.selfId = +tomon.discriminator
    this.app.bots[selfId] = bot
    tomon.on('MESSAGE_CREATE', async ({ d }) => {
      const userId = +d.author.discriminator
      if (userId === selfId) return
      this.dispatch(new Session(this.app, {
        ...camelize(d),
        selfId,
        userId,
        kind: 'tomon',
        message: d.content,
        postType: 'message',
        messageType: d['guild_id'] ? 'group' : 'private',
        groupId: d['guild_id'],
      }))
    })
  }

  async listen() {
    await Promise.all(this.bots.map(bot => this._listen(bot)))
  }

  close() {}
}
