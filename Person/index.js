const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/helpers/decode-access-token')
const httpResponse = require('../lib/requests/http-response')
const { isFnr } = require('../lib/helpers/identifikator-type')
const { roles } = require('../config')
const { fintPerson } = require('../lib/fint-person')
const { getResponse, setResponse } = require('../lib/response-cache')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-fint-folk - Person'

  })
  logger('info', ['New Request. Validating token'], context)
  const decoded = decodeAccessToken(req.headers.authorization)
  if (!decoded.verified) {
    logger('warn', ['Token is not valid', decoded.msg], context)
    return httpResponse(401, decoded.msg)
  }
  logConfig({
    prefix: `azf-fint-folk - Person - ${decoded.appid}${decoded.upn ? ' - ' + decoded.upn : ''}`
  })
  logger('info', ['Token is valid, checking params'], context)
  if (!req.params) {
    logger('info', ['No params here...'], context)
    return httpResponse(400, 'Missing query params')
  }

  const { identifikator, identifikatorverdi } = req.params
  const validIdentifiers = ['fodselsnummer']
  if (!validIdentifiers.includes(identifikator)) return httpResponse(400, `Query param ${identifikator} is not valid - must be ${validIdentifiers.join(' or ')}`)

  if (identifikator === 'fodselsnummer' && !isFnr(identifikatorverdi)) return httpResponse(400, 'Property "fodselsnummer" must be 11 characters')

  logger('info', ['Validating role'], context)
  if (!decoded.roles.includes(roles.personRead) && !decoded.roles.includes(roles.readAll)) {
    logger('info', ['Missing required role for access'], context)
    return httpResponse(403, 'Missing required role for access')
  }
  logger('info', ['Role validated'], context)

  // Cache
  if (req.query.skipCache !== 'true') {
    const cachedResponse = getResponse(req.url, context)
    if (cachedResponse) return httpResponse(200, cachedResponse)
  }

  let fodselsnummer

  // If simply getting with fodselsnummer
  if (identifikator === 'fodselsnummer') fodselsnummer = identifikatorverdi

  try {
    const res = await fintPerson(fodselsnummer, context)
    if (!res) return httpResponse(404, 'No person with provided identificator found in FINT')
    const result = req.query.includeRaw === 'true' ? { ...res.repacked, raw: res.raw } : res.repacked
    if (req.query.skipCache !== 'true') setResponse(req.url, result, context) // Cache result
    return httpResponse(200, result)
  } catch (error) {
    logger('error', ['Failed when fetching person from FINT', error.response?.data || error.stack || error.toString()], context)
    return httpResponse(500, error)
  }
}
