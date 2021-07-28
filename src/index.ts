import { spawnSync } from "child_process"

const unsafeKeys = <A>(x: A): Array<keyof typeof x> =>
  Object.keys(x) as Array<keyof typeof x>

const init = ({
  typescript: ts,
}: {
  typescript: typeof import("typescript/lib/tsserverlibrary")
}) => ({
  create: ({
    languageService: lsvc,
  }: ts.server.PluginCreateInfo): ts.LanguageService => {
    const proxy: ts.LanguageService = Object.create(null)
    for (const k of unsafeKeys(lsvc)) {
      // @ts-ignore
      proxy[k] = (...xs: Array<unknown>) => lsvc[k].apply(lsvc, xs)
    }

    proxy.getQuickInfoAtPosition = (fn, pos): ts.QuickInfo | undefined => {
      const qinfo = lsvc.getQuickInfoAtPosition(fn, pos)

      if (qinfo?.displayParts) {
        const def =
          qinfo.displayParts.reduce((acc, part) => acc + part.text, "") ?? ""
        const cmd = spawnSync("tshm", ["-a"], { input: "declare " + def })
        if (cmd.status === 0) {
          qinfo.displayParts = qinfo.displayParts.concat([
            { text: "\n\n" + cmd.stdout, kind: "text" },
          ])
        }
      }

      return qinfo
    }

    return proxy
  },
})

export = init
