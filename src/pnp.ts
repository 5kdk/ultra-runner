import { readFileSync } from "fs"
import { resolve } from "path"
import v8 from "v8"
import zlib from "zlib"

type InstallState = {
  storedResolutions: Map<string, string>
  storedPackages: Map<
    string,
    {
      name: string
      scope?: string
      reference: string
      locatorHash: string
      bin: Map<string, string>
      dependencies?: Map<string, { descriptorHash: string }>
    }
  >
}

export function getBinaries(workspaceRoot: string, packageName: string) {
  const binaries = new Set<string>()

  const serializedState = readFileSync(
    resolve(workspaceRoot, ".yarn", "install-state.gz")
  )
  const installState = v8.deserialize(
    zlib.gunzipSync(serializedState)
  ) as InstallState

  const hashes = new Set<string>()

  for (const p of installState.storedPackages.values()) {
    const pkgName = p.scope ? `@${p.scope}/${p.name}` : p.name
    if (packageName == pkgName) {
      hashes.add(p.locatorHash)
      p.dependencies?.forEach((dep) => {
        const h = installState.storedResolutions.get(dep.descriptorHash)
        if (h) hashes.add(h)
      })
    }
  }

  for (const h of hashes) {
    const p = installState.storedPackages.get(h)
    if (p?.bin.size) {
      ;[...p.bin.keys()].forEach((b) => binaries.add(b))
    }
  }
  return [...binaries]
}