import { Plugin } from "@opencode/plugin"
import { appendFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const MAX_INPUT_TOKENS = 15000
const MAX_READ_LINES = 150
const LOG = join(tmpdir(), "input-guard.log")

function log(line: string) {
  try {
    appendFileSync(LOG, `${new Date().toISOString()} ${line}\n`)
  } catch {}
}

function tokens(value: unknown): number {
  return Math.ceil(JSON.stringify(value ?? "").length / 4)
}

export default Plugin.define({
  id: "input-guard",
  async setup(ctx) {
    // Cap every read so a single call cannot flood the context.
    await ctx.tool.hook("execute.before", (event: any) => {
      if (event.tool !== "read" || !event.input) return
      const limit = Number(event.input.limit ?? MAX_READ_LINES)
      if (!Number.isFinite(limit) || limit > MAX_READ_LINES) {
        event.input.limit = MAX_READ_LINES
      }
    })

    // Keep the per-turn input under MAX_INPUT_TOKENS by dropping old messages.
    await ctx.session.hook("context", (event: any) => {
      const messages: any[] = Array.isArray(event.messages) ? event.messages : []
      if (messages.length < 3) return

      let used = tokens(event.system)
      for (const message of messages) used += tokens(message)
      if (used <= MAX_INPUT_TOKENS) {
        log(`ok before=${used} msgs=${messages.length}`)
        return
      }

      const first = messages[0]
      const kept: any[] = []
      // System prompt, first message and the injected note count against the cap too.
      let budget = tokens(first) + tokens(event.system) + 400
      for (let i = messages.length - 1; i >= 1; i--) {
        const cost = tokens(messages[i])
        if (budget + cost > MAX_INPUT_TOKENS) break
        kept.unshift(messages[i])
        budget += cost
      }

      const dropped = messages.length - kept.length - 1
      event.messages = first ? [first, ...kept] : kept
      event.system = event.system ?? []
      event.system.push({
        type: "text",
        text: `[input-guard] ${dropped} pesan lama dipangkas. Baca STATE.md untuk keadaan terakhir.`,
      })
      const after = tokens(event.messages) + tokens(event.system)
      log(`trim before=${used} after=${after} kept=${kept.length} dropped=${dropped}`)
    })
  },
})
