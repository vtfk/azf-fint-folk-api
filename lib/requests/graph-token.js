const { ConfidentialClientApplication } = require('@azure/msal-node')
const { graphClient } = require('../../config')
const { logger } = require('@vtfk/logger')
const Cache = require('file-system-cache').default

const tokenCache = Cache({
  basePath: './.token-cache'
})

module.exports = async (context, forceNew = false) => {
  const cacheKey = 'graphToken'

  const cachedToken = tokenCache.getSync(cacheKey)
  if (!forceNew && cachedToken) {
    logger('info', ['getGraphToken', 'found valid token in cache, will use that instead of fetching new'], context)
    return cachedToken.substring(0, cachedToken.length - 2)
  }

  logger('info', ['getGraphToken', 'no token in cache, fetching new from Microsoft'], context)
  const config = {
    auth: {
      clientId: graphClient.clientId,
      authority: `https://login.microsoftonline.com/${graphClient.tenantId}/`,
      // knownAuthorities: ["login.microsoftonline.com"],
      clientSecret: graphClient.clientSecret
    }
  }

  // Create msal application object
  const cca = new ConfidentialClientApplication(config)
  const clientCredentials = {
    scopes: [graphClient.scope]
  }

  const token = await cca.acquireTokenByClientCredential(clientCredentials)

  const expires = Math.floor((token.expiresOn.getTime() - new Date()) / 1000)
  logger('info', ['getGraphToken', `Got token from Microsoft, expires in ${expires} seconds.`], context)
  tokenCache.setSync(cacheKey, `${token.accessToken}==`, expires) // Haha, just to make the cached token not directly usable
  logger('info', ['getGraphToken', 'Token stored in cache'], context)

  return token.accessToken
}
