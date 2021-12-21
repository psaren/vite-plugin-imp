import { Plugin, ResolvedConfig } from 'vite'
import { ImpConfig, log, addImportToCode, codeIncludesLibraryName } from './shared'
import chalk from 'chalk'
import defaultLibList from './defaultLibList'
import * as path from 'path'
import * as fs from 'fs'


const optionsCheck = (options: ImpConfig) => {
  if (options?.libList && !Array.isArray(options?.libList)) {
    log(chalk.yellow(`libList is Array, please check your options!`))
    return false
  }
  return true
}

export default function vitePluginImp(config: ImpConfig): Plugin {
  let viteConfig: ResolvedConfig
  const name = 'vite-plugin-imp'
  if (!optionsCheck(config)) {
    return { name }
  }
  if (!config.libList?.length) {
    config.libList = []
  }
  if (!config.exclude?.length) {
    config.exclude = []
  }

  const libListNameSet: Set<string> = new Set(config.libList.map(lib => lib.libName))

  return {
    name,
    configResolved(resolvedConfig) {
      // store the resolved config
      viteConfig = resolvedConfig

      // filter defaultLibList from exclude
      let defaultLibFilteredList = defaultLibList.filter(lib => !config.exclude?.includes(lib.libName))

      // check user package.json to filter LibList from user dependencies
      const userPkgPath = path.resolve(viteConfig.root, 'package.json')
      if (fs.existsSync(userPkgPath)) {
        const userPkg = require(userPkgPath)
        if (userPkg?.dependencies) {
          defaultLibFilteredList = defaultLibFilteredList.filter(item => userPkg?.dependencies?.[item.libName])
        }
      }

      // merge defaultLibFilteredList to config.libList
      defaultLibFilteredList.forEach(defaultLib => {
        if (!libListNameSet.has(defaultLib.libName)) {
          config.libList.push(defaultLib)
          libListNameSet.add(defaultLib.libName)
        }
      })
      console.log(`config.libList`, config.libList)
    },
    transform(code, id) {
      if (!/(node_modules)/.test(id) && codeIncludesLibraryName(code, config.libList)) {
        const sourcemap = this?.getCombinedSourcemap()
        return {
          code: addImportToCode(code, config, viteConfig.command),
          map: sourcemap
        }
      }
      return {
        code,
        map: null
      }
    }
  }
}
