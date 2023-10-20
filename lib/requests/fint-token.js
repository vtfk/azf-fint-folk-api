const ClientOAuth2 = require('client-oauth2')
const NodeCache = require('node-cache')
const { fint } = require('../../config')
const { logger } = require('@vtfk/logger')

const cache = new NodeCache({ stdTTL: 3000 })

module.exports = async (context, forceNew = false) => {
  const cacheKey = 'fintToken'

  if (!forceNew && cache.get(cacheKey)) {
    logger('info', ['getFintToken', 'found valid token in cache, will use that instead of fetching new'], context)
    return (cache.get(cacheKey))
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
  cache.set(cacheKey, accessToken, data.expires_in)
  logger('info', ['getFintToken', 'token cached for further use', `Token expires in ${data.expires_in} seconds`], context)
  return accessToken
}
