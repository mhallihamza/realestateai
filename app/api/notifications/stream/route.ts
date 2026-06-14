import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { addSSEClient, broadcastToWorkspace } from '@/lib/notifications'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const workspaceId = (session.user as any).workspaceId

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(`data: {"type":"connected","workspaceId":"${workspaceId}"}\n\n`))

      // Register SSE client
      const cleanup = addSSEClient(workspaceId, (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          cleanup()
        }
      })

      // Keep-alive every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(keepAlive)
          cleanup()
        }
      }, 30000)

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive)
        cleanup()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}