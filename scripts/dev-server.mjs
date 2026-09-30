#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { isIPv4 } from 'node:net'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const root = fileURLToPath(new URL('../', import.meta.url))
let server
let stopping = false

async function stop(code = 0) {
  if (stopping) return
  stopping = true
  // Do not leave watchers/sockets behind if shutdown itself stalls.
  const timeout = setTimeout(() => process.exit(code), 5000)
  timeout.unref()
  try {
    await server?.close()
  } finally {
    process.exit(code)
  }
}

function tailscaleAddress() {
  const candidates = [
    process.env.TAILSCALE_BIN,
    'tailscale',
    '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
  ].filter(Boolean)
  for (const binary of candidates) {
    let output
    try {
      output = execFileSync(binary, ['status', '--json'], {
        encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw new Error('Não foi possível consultar o Tailscale. Abra o app, conecte-se e tente novamente.')
    }
    let status
    try {
      status = JSON.parse(output)
    } catch {
      throw new Error('O Tailscale retornou um status inválido. Verifique sua instalação.')
    }
    if (status.BackendState !== 'Running') {
      throw new Error('Tailscale desconectado. Conecte-se no app Tailscale e tente novamente.')
    }
    const ip = (status.TailscaleIPs ?? status.Self?.TailscaleIPs ?? []).find(isIPv4)
    if (!ip) throw new Error('Tailscale conectado, mas sem endereço IPv4 disponível.')
    const dns = status.Self?.DNSName?.replace(/\.$/, '')
    return { ip, dns }
  }
  throw new Error('Tailscale não encontrado. Instale o app/CLI ou indique o executável com TAILSCALE_BIN.')
}

try {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter(arg => arg !== '--'),
    options: {
      tailscale: { type: 'boolean', default: false },
      port: { type: 'string', short: 'p', default: '5173' },
      help: { type: 'boolean', short: 'h' },
    },
  })
  if (values.help) {
    console.log(`Servidor de teste do Titan\n
  pnpm dev                       Acesso local
  pnpm dev --tailscale           Acesso pela rede Tailscale
  pnpm dev --tailscale --port 5200
  node /caminho/do/repo/scripts/dev-server.mjs [opções]

--port, -p   Porta inicial (padrão: 5173); ocupada → próxima livre
--tailscale  Exige Tailscale conectado; escuta somente no IP Tailscale
--help, -h   Mostra esta ajuda

Ctrl+C encerra o servidor. TAILSCALE_BIN permite indicar o executável.
Execute pnpm install no repositório se as dependências estiverem ausentes.`)
    process.exit(0)
  }
  const port = Number(values.port)
  if (!/^\d+$/.test(values.port) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('--port deve ser um inteiro entre 1 e 65535.')
  }
  process.chdir(root)
  if (!existsSync(new URL('../node_modules/vite/package.json', import.meta.url))) {
    throw new Error('Dependências ausentes. Execute pnpm install no repositório e tente novamente.')
  }
  const remote = values.tailscale ? tailscaleAddress() : undefined
  const { createServer } = await import('vite')
  server = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    clearScreen: false,
    server: {
      host: remote?.ip ?? '127.0.0.1',
      port,
      strictPort: false,
      allowedHosts: remote?.dns ? [remote.dns] : [],
    },
  })
  process.once('SIGINT', () => void stop())
  process.once('SIGTERM', () => void stop())
  await server.listen()
  if (stopping) await stop()
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Servidor sem porta TCP disponível.')
  console.log(`\nTitan pronto: http://${remote?.ip ?? '127.0.0.1'}:${address.port}/`)
  if (remote) {
    console.log('Abra a URL em um aparelho conectado à mesma rede Tailscale (com acesso permitido pelas regras da rede).')
  }
  console.log('Ctrl+C para encerrar. Alterações no código atualizam a página automaticamente.\n')
} catch (error) {
  console.error(`\nNão foi possível iniciar: ${error.message}`)
  if (error.code === 'EADDRNOTAVAIL') {
    console.error('O IP Tailscale não está disponível nesta máquina. Verifique a conexão do app.')
  }
  await stop(1)
}
