const ClientOAuth2 = require('client-oauth2')
const { fint } = require('../../config')
const { logger } = require('@vtfk/logger')
const Cache = require('file-system-cache').default

const tokenCache = Cache({
  basePath: './.token-cache'
})

module.exports = async (context, forceNew = false) => {
  const cacheKey = 'fintToken'

  const cachedToken = tokenCache.getSync(cacheKey)
  if (!forceNew && cachedToken) {
    logger('info', ['getFintToken', 'found valid token in cache, will use that instead of fetching new'], context)
    return cachedToken.substring(0, cachedToken.length - 2)
  }

  logger('info', ['getFintToken', 'no token in cache, fetching new from FINT'], context)
  const clientOptions = {
    accessTokenUri: fint.tokenUrl,
    clientId: fint.clientId,
    clientSecret: fint.clientSecret,
    scopes: [fint.scope]
  }
  const { accessToken, data } = await new ClientOAuth2(clientOptions).owner.getToken(fint.username, fint.password)
  logger('info', ['getFintToken', 'token fetched from FINT'], context)
  tokenCache.setSync(cacheKey, `${accessToken}==`, data.expires_in) // Haha, just to make the cached token not directly usable
  logger('info', ['getFintToken', 'token cached for further use', `Token expires in ${data.expires_in} seconds`], context)
  return accessToken
}
