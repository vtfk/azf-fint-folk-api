const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/helpers/decode-access-token')
const httpResponse = require('../lib/requests/http-response')
const { isFnr } = require('../lib/helpers/identifikator-type')
const { roles } = require('../config')
const fintPerson = require('../lib/fint-person')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-fint-folk - Person',
    azure: {
      context,
      excludeInvocationId: false
    }
  })
  logger('info', ['New Request. Validating token'])
  const decoded = decodeAccessToken(req.headers.authorization)
  if (!decoded.verified) {
    logger('warn', ['Token is not valid', decoded.msg])
    return httpResponse(401, decoded.msg)
  }
  logConfig({
    prefix: `azf-fint-folk - Person - ${decoded.appid}${decoded.upn ? ' - ' + decoded.upn : ''}`,
    azure: {
      context,
      excludeInvocationId: false
    }
  })
  logger('info', ['Token is valid, checking params'])
  if (!req.params) {
    logger('info', ['No params here...'])
    return httpResponse(400, 'Missing query params')
  }

  const { identifikator, identifikatorverdi } = req.params
  const validIdentifiers = ['fodselsnummer']
  if (!validIdentifiers.includes(identifikator)) return httpResponse(400, `Query param ${identifikator} is not valid - must be ${validIdentifiers.join(' or ')}`)

  if (identifikator === 'fodselsnummer' && !isFnr(identifikatorverdi)) return httpResponse(400, 'Property "fodselsnummer" must be 11 characters')

  logger('info', ['Validating role'])
  if (!decoded.roles.includes(roles.personRead)) {
    logger('info', ['Missing required role for access'])
    return httpResponse(403, 'Missing required role for access')
  }
  logger('info', ['Role validated'])

  let fodselsnummer

  // If simply getting with fodselsnummer
  if (identifikator === 'fodselsnummer') fodselsnummer = identifikatorverdi

  try {
    const res = await fintPerson(fodselsnummer)
    if (!res) return httpResponse(404, `No person with fodselsnummer "${fodselsnummer}" found in FINT`)
    const result = req.query.includeRaw === 'true' ? { ...res.repacked, raw: res.raw } : res.repacked
    return httpResponse(200, result)
  } catch (error) {
    logger('error', [error])
    return { status: 500, body: error.toString() }
  }
}
