import { expect, test, beforeAll } from "bun:test"

type PluginModule = {
  default: () => Promise<{
    auth: {
      provider: string
      methods: Array<{
        type: string
        label: string
        authorize: (inputs: Record<string, unknown> | undefined) => Promise<{ type: string; key?: string }>
      }>
      loader: (getAuth: () => Promise<{ type: string; key?: string } | null>) => Promise<Record<string, unknown>>
    }
  }>
}

let pluginFn: PluginModule["default"]

beforeAll(async () => {
  const mod = await import("../../plugin.ts")
  pluginFn = mod.default
})

test("plugin returns correct provider name", async () => {
  const plugin = await pluginFn()
  expect(plugin.auth.provider).toBe("commandcode")
})

test("authorize returns success with valid key", async () => {
  const plugin = await pluginFn()
  const result = await plugin.auth.methods[0].authorize({ key: "sk-valid-key" })
  expect(result.type).toBe("success")
  expect((result as any).key).toBe("sk-valid-key")
})

test("authorize returns failed with empty key", async () => {
  const plugin = await pluginFn()
  const result = await plugin.auth.methods[0].authorize({ key: "   " })
  expect(result.type).toBe("failed")
})

test("authorize returns failed with undefined key", async () => {
  const plugin = await pluginFn()
  const result = await plugin.auth.methods[0].authorize({ key: undefined })
  expect(result.type).toBe("failed")
})

test("authorize returns failed with missing inputs", async () => {
  const plugin = await pluginFn()
  const result = await plugin.auth.methods[0].authorize(undefined)
  expect(result.type).toBe("failed")
})

test("authorize handles non-string key", async () => {
  const plugin = await pluginFn()
  const result = await plugin.auth.methods[0].authorize({ key: 123 as unknown as string })
  expect(result.type).toBe("failed")
})

test("loader returns apiKey on successful auth", async () => {
  const plugin = await pluginFn()
  const result = await plugin.auth.loader(async () => ({
    type: "api",
    key: "sk-loaded-key",
  }))
  expect(result).toEqual({ apiKey: "sk-loaded-key" })
})

test("loader returns empty object on null auth", async () => {
  const plugin = await pluginFn()
  const result = await plugin.auth.loader(async () => null)
  expect(result).toEqual({})
})

test("loader returns empty object on wrong auth type", async () => {
  const plugin = await pluginFn()
  const result = await plugin.auth.loader(async () => ({
    type: "oauth",
    key: "some-token",
  } as any))
  expect(result).toEqual({})
})

test("loader returns empty object when getAuth throws", async () => {
  const plugin = await pluginFn()
  const result = await plugin.auth.loader(async () => {
    throw new Error("auth failed")
  })
  expect(result).toEqual({})
})
