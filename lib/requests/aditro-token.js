const { aditro } = require('../../config')
const { logger } = require('@vtfk/logger')
const axios = require('axios')
const Cache = require('file-system-cache').default

const tokenCache = Cache({
  basePath: './.token-cache'
})

module.exports = async (context, forceNew = false) => {
  const cacheKey = 'aditroToken'

  const cachedToken = tokenCache.getSync(cacheKey)
  if (!forceNew && cachedToken) {
    logger('info', ['getAditroToken', 'found valid token in cache, will use that instead of fetching new'], context)
    return cachedToken.substring(0, cachedToken.length - 2)
  }

  logger('info', ['getAditroToken', 'no token in cache, fetching new from Aditro'], context)

  const authOptions = {
    grant_type: 'client_credentials',
    client_id: aditro.clientId,
    client_secret: aditro.clientSecret,
    acr_values: `tenant:${aditro.tenantId}`
  }

  const { data } = await axios.post(aditro.tokenUrl, new URLSearchParams(authOptions).toString())
  const { access_token: accessToken, expires_in: expiresIn } = data // desctructure and rename for the sake of StandardJS

  logger('info', ['getAditroToken', 'token fetched from Aditro'], context)
  tokenCache.setSync(cacheKey, `${accessToken}==`, expiresIn) // Haha, just to make the cached token not directly usable
  logger('info', ['getAditroToken', 'token cached for further use', `Token expires in ${expiresIn} seconds`], context)
  return accessToken
}
