const { fintEmployee } = require('../lib/fint-employee')
const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/helpers/decode-access-token')
const httpResponse = require('../lib/requests/http-response')
const { roles } = require('../config')
const { getAnsattnummer } = require('../lib/requests/call-graph')
const { fintGraph } = require('../lib/requests/call-fint')
const { isAnsattnummer, isEmail, isFnr } = require('../lib/helpers/identifikator-type')
const { getResponse, setResponse } = require('../lib/response-cache')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-fint-folk - Employee'
  })
  logger('info', ['New Request. Validating token'], context)
  const decoded = decodeAccessToken(req.headers.authorization)
  if (!decoded.verified) {
    logger('warn', ['Token is not valid', decoded.msg], context)
    return httpResponse(401, decoded.msg)
  }
  logConfig({
    prefix: `azf-fint-folk - Employee - ${decoded.appid}${decoded.upn ? ' - ' + decoded.upn : ''}`
  })
  logger('info', ['Token is valid, checking params'], context)
  if (!req.params) {
    logger('info', ['No params here...'], context)
    return httpResponse(400, 'Missing query params')
  }

  const { identifikator, identifikatorverdi } = req.params
  const validIdentifiers = ['ansattnummer', 'fodselsnummer', 'upn']
  if (!validIdentifiers.includes(identifikator)) return httpResponse(400, `Query param ${identifikator} is not valid - must be ${validIdentifiers.join(' or ')}`)

  if (identifikator === 'ansattnummer' && !isAnsattnummer(identifikatorverdi)) return httpResponse(400, '"ansattnummer" must be a numerical string, and less than 20 characters')
  if (identifikator === 'upn' && !isEmail(identifikatorverdi)) return httpResponse(400, '"upn" must be valid email')
  if (identifikator === 'fodselsnummer' && !isFnr(identifikatorverdi)) return httpResponse(400, 'Property "fodselsnummer" must be 11 characters')

  logger('info', ['Validating role'], context)
  if (!decoded.roles.includes(roles.employeeRead) && !decoded.roles.includes(roles.readAll)) {
    logger('info', ['Missing required role for access'], context)
    return httpResponse(403, 'Missing required role for access')
  }
  logger('info', ['Role validated'], context)

  // Cache
  if (!req.query.skipCache) {
    const cachedResponse = getResponse(req.url, context)
    if (cachedResponse) return httpResponse(200, cachedResponse)
  }

  let ansattnummer
  // If getting with upn
  if (identifikator === 'upn') {
    logger('info', ['Queryparam is type "upn", fetching ansattnummer from AzureAD'])
    try {
      ansattnummer = await getAnsattnummer(identifikatorverdi)
      logger('info', [`Got ansattnummer: ${ansattnummer}`], context)
    } catch (error) {
      if (error.response?.status === 404) {
        logger('error', ['No user with provided upn found in EntraID', error.response?.data || error.stack || error.toString()], context)
        return httpResponse(404, 'No user with provided upn found in EntraID')
      }
      logger('error', ['Failed when getting ansattnummer from AzureAD', error.response?.data || error.stack || error.toString()], context)
      return httpResponse(500, error)
    }
  }

  // If getting with fnr
  if (identifikator === 'fodselsnummer') {
    logger('info', ['Queryparam is type "fodselsnummer", fetching ansattnummer from FINT'], context)
    try {
      const payload = {
        query: `
          query {
            person(fodselsnummer: "${identifikatorverdi}") {
              personalressurs {
                ansattnummer {
                  identifikatorverdi
                }
              }
            }
          }
        `
      }
      const { data } = await fintGraph(payload)
      ansattnummer = data.person?.personalressurs?.ansattnummer?.identifikatorverdi
      if (!ansattnummer) return httpResponse(404, 'No employee with provided identificator found in FINT')
      logger('info', [`Got ansattnummer: ${ansattnummer}`], context)
    } catch (error) {
      logger('error', ['Failed when getting ansattnummer from FINT', error.response?.data || error.stack || error.toString()], context)
      return httpResponse(500, error)
    }
  }

  // If simply getting with ansattnummer
  if (identifikator === 'ansattnummer') ansattnummer = identifikatorverdi

  try {
    const res = await fintEmployee(ansattnummer, context)
    if (!res) return httpResponse(404, 'No employee with provided identificator found in FINT')
    const result = req.query.includeRaw === 'true' ? { ...res.repacked, raw: res.raw } : res.repacked
    if (!req.query.skipCache) setResponse(req.url, result, context) // Cache result
    return httpResponse(200, result)
  } catch (error) {
    logger('error', ['Failed when getting employee from FINT', error.response?.data || error.stack || error.toString()], context)
    return httpResponse(500, error)
  }
}
