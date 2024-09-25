const Cache = require('file-system-cache').default
const { logger } = require('@vtfk/logger')
const { responseCache } = require('../config')

const resCache = Cache({
  basePath: './.response-cache'
})

const getResponse = (urlCacheKey, context) => {
  if (!responseCache.enabled) return null
  const cachedResponse = resCache.getSync(urlCacheKey)
  if (cachedResponse) {
    logger('info', ['response-cache', `found fresh response in response-cache for key: "${urlCacheKey}", quick return`], context)
    return cachedResponse
  }
  logger('info', ['response-cache', `no response in response-cache for key: "${urlCacheKey}", will have to fetch and generate response`], context)
  return null
}

const setResponse = (urlCacheKey, data, context, customTtl) => {
  if (!responseCache.enabled) return null
  try {
    resCache.setSync(urlCacheKey, data, customTtl || responseCache.ttl)
    logger('info', [`response-cache', 'Successfully set response data for cacheKey "${urlCacheKey}"`], context)
  } catch (error) {
    logger('warn', [`response-cache', 'Could not set data for cacheKey "${urlCacheKey}", will have to try again next time :(`, error.stack || error.toString()], context)
  }
}

module.exports = { getResponse, setResponse }
