import crypto from 'node:crypto'

import prismaManager from '../../lib/database/prisma.js'
import { DomainError } from '../../lib/agents/AgentService.js'

const newId = (prefix) => `${prefix}_${crypto.randomUUID()}`

export class ChannelConversationService {
  constructor({ prisma = null } = {}) {
    this.prisma = prisma
  }

  async _database() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
    return this.prisma
  }

  _key({ agentId, channelId, externalConversationId }) {
    return {
      channelId_agentId_externalConversationId: {
        agentId: String(agentId),
        channelId: String(channelId),
        externalConversationId: String(externalConversationId),
      },
    }
  }

  async resolve({ agentId, channelId, envelope }, retryCount = 0) {
    const prisma = await this._database()
    const externalConversationId = envelope.conversation.externalConversationId
    const key = this._key({ agentId, channelId, externalConversationId })
    try {
      return await prisma.$transaction(async (tx) => {
        let conversation = await tx.channelConversation.findUnique({
          where: key,
        })
        if (!conversation) {
          const session = await tx.session.create({
            data: {
              agentId: String(agentId),
              id: newId('session'),
              title:
                envelope.conversation.type === 'group'
                  ? `${envelope.source.channelName || envelope.source.adapterId} 群聊`
                  : envelope.actor.displayName || '渠道会话',
            },
          })
          conversation = await tx.channelConversation.create({
            data: {
              activeSessionId: session.id,
              agentId: String(agentId),
              channelId: String(channelId),
              conversationType: envelope.conversation.type,
              externalConversationId,
              externalThreadId: envelope.conversation.externalThreadId,
              id: newId('channel_conversation'),
              lastActiveAt: new Date(envelope.message.receivedAt),
              sessions: { create: { sessionId: session.id } },
            },
          })
        } else {
          conversation = await tx.channelConversation.update({
            data: {
              conversationType: envelope.conversation.type,
              externalThreadId: envelope.conversation.externalThreadId,
              lastActiveAt: new Date(envelope.message.receivedAt),
            },
            where: { id: conversation.id },
          })
        }
        await tx.channelConversationMember.upsert({
          create: {
            channelConversationId: conversation.id,
            displayName: envelope.actor.displayName,
            externalUserId: envelope.actor.externalUserId,
            lastActiveAt: new Date(envelope.message.receivedAt),
            role: envelope.actor.role,
          },
          update: {
            displayName: envelope.actor.displayName,
            lastActiveAt: new Date(envelope.message.receivedAt),
            role: envelope.actor.role,
          },
          where: {
            channelConversationId_externalUserId: {
              channelConversationId: conversation.id,
              externalUserId: envelope.actor.externalUserId,
            },
          },
        })
        if (!conversation.activeSessionId) {
          const session = await tx.session.create({
            data: {
              agentId: String(agentId),
              id: newId('session'),
              title: '渠道会话',
            },
          })
          await tx.channelSessionLink.create({
            data: {
              channelConversationId: conversation.id,
              sessionId: session.id,
            },
          })
          conversation = await tx.channelConversation.update({
            data: { activeSessionId: session.id },
            where: { id: conversation.id },
          })
        }
        return { conversation, sessionId: conversation.activeSessionId }
      })
    } catch (error) {
      // Two first messages for the same external conversation may arrive in
      // parallel. The unique conversation key elects one winner; retrying then
      // observes and reuses that winner instead of creating duplicate Sessions.
      if (error?.code === 'P2002' && retryCount < 2) {
        return await this.resolve(
          { agentId, channelId, envelope },
          retryCount + 1,
        )
      }
      throw error
    }
  }

  scope(conversationId, agentId) {
    return {
      activate: (sessionId) =>
        this.activate(conversationId, agentId, sessionId),
      create: (title) => this.createAndActivate(conversationId, agentId, title),
      delete: (sessionId) =>
        this.deleteSession(conversationId, agentId, sessionId),
      getActive: () => this.getActive(conversationId, agentId),
      list: () => this.listSessions(conversationId, agentId),
    }
  }

  async getActive(conversationId, agentId) {
    const prisma = await this._database()
    return (
      (
        await prisma.channelConversation.findFirst({
          select: { activeSessionId: true },
          where: { agentId: String(agentId), id: String(conversationId) },
        })
      )?.activeSessionId || null
    )
  }

  async listSessions(conversationId, agentId) {
    const prisma = await this._database()
    const links = await prisma.channelSessionLink.findMany({
      include: {
        session: { include: { _count: { select: { messages: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      where: {
        conversation: { agentId: String(agentId), id: String(conversationId) },
      },
    })
    return links.map(({ session }) => ({
      id: session.id,
      kind: session.kind,
      msgCount: session._count.messages,
      parentSessionId: session.parentSessionId,
      title: session.title || '',
      visible: session.visible,
    }))
  }

  async createAndActivate(conversationId, agentId, title = '新会话') {
    const prisma = await this._database()
    return await prisma.$transaction(async (tx) => {
      const conversation = await tx.channelConversation.findFirst({
        where: { agentId: String(agentId), id: String(conversationId) },
      })
      if (!conversation)
        throw new DomainError(
          'channel_conversation_not_found',
          'Channel conversation not found',
          404,
        )
      const session = await tx.session.create({
        data: {
          agentId: String(agentId),
          id: newId('session'),
          title: String(title || '新会话'),
        },
      })
      await tx.channelSessionLink.create({
        data: { channelConversationId: conversation.id, sessionId: session.id },
      })
      await tx.channelConversation.update({
        data: { activeSessionId: session.id },
        where: { id: conversation.id },
      })
      return { id: session.id, title: session.title || '' }
    })
  }

  async activate(conversationId, agentId, sessionId) {
    const prisma = await this._database()
    const link = await prisma.channelSessionLink.findFirst({
      include: { session: true },
      where: {
        channelConversationId: String(conversationId),
        sessionId: String(sessionId),
        conversation: { agentId: String(agentId) },
      },
    })
    if (!link || link.session.agentId !== String(agentId)) {
      throw new DomainError(
        'session_forbidden',
        'Session is not linked to this Channel conversation',
        403,
      )
    }
    await prisma.channelConversation.update({
      data: { activeSessionId: link.sessionId },
      where: { id: String(conversationId) },
    })
    return link.session
  }

  async deleteSession(conversationId, agentId, sessionId) {
    const prisma = await this._database()
    return await prisma.$transaction(async (tx) => {
      const linked = await tx.channelSessionLink.findFirst({
        include: { conversation: true },
        where: {
          channelConversationId: String(conversationId),
          sessionId: String(sessionId),
          conversation: { agentId: String(agentId) },
        },
      })
      if (!linked)
        throw new DomainError(
          'session_forbidden',
          'Session is not linked to this Channel conversation',
          403,
        )
      await tx.session.delete({ where: { id: String(sessionId) } })
      let activeSessionId = linked.conversation.activeSessionId
      if (activeSessionId === String(sessionId)) {
        activeSessionId =
          (
            await tx.channelSessionLink.findFirst({
              orderBy: { createdAt: 'desc' },
              select: { sessionId: true },
              where: { channelConversationId: String(conversationId) },
            })
          )?.sessionId || null
        await tx.channelConversation.update({
          data: { activeSessionId },
          where: { id: String(conversationId) },
        })
      }
      return { activeSessionId, deleted: true, sessionId: String(sessionId) }
    })
  }
}

export default ChannelConversationService
