const fintEmployee = require('../lib/fint-employee')
const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/decode-access-token')
const httpResponse = require('../lib/http-response')
const { roles } = require('../config')
const { getAnsattnummer } = require('../lib/call-graph')
const { fintGraph } = require('../lib/call-fint')
const { isAnsattnummer, isEmail, isFnr } = require('../lib/identifikator-type')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-fint-folk - Employee',
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
    prefix: `azf-fint-folk - Employee - ${decoded.appid}${decoded.upn ? ' - ' + decoded.upn : ''}`,
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
  const validIdentifiers = ['ansattnummer', 'fodselsnummer', 'upn']
  if (!validIdentifiers.includes(identifikator)) return httpResponse(400, `Query param ${identifikator} is not valid - must be ${validIdentifiers.join(' or ')}`)

  if (identifikator === 'ansattnummer' && !isAnsattnummer(identifikatorverdi)) return httpResponse(400, '"ansattnummer" must be between 7-9 characters')
  if (identifikator === 'upn' && !isEmail(identifikatorverdi)) return httpResponse(400, '"upn" must be valid email')
  if (identifikator === 'fodselsnummer' && !isFnr(identifikatorverdi)) return httpResponse(400, 'Property "fodselsnummer" must be 11 characters')

  logger('info', ['Validating role'])
  if (!decoded.roles.includes(roles.employeeRead)) {
    logger('info', [`Missing required role for access`])
    return httpResponse(403, 'Missing required role for access')
  }
  logger('info', ['Role validated'])

  let ansattnummer
  // If getting with upn
  if (identifikator === 'upn') {
    logger('info', ['Queryparam is type "upn", fetching ansattnummer from AzureAD'])
    try {
      ansattnummer = await getAnsattnummer(identifikatorverdi)
      logger('info', [`Got ansattnummer: ${ansattnummer}`])
    } catch (error) {
      logger('error', ['Failed when getting ansattnummer from AzureAD', error.response?.data || error.stack || error.toString()])
      return httpResponse(500, error)
    }
  }
  
  // If getting with fnr
  if (identifikator === 'fodselsnummer') {
    logger('info', ['Queryparam is type "fodselsnummer", fetching ansattnummer from FINT'])
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
      if (!ansattnummer) return httpResponse(404, `No student with feidenavn "${ansattnummer}" found in FINT`)
      logger('info', [`Got feidenavn: ${ansattnummer}`])
    } catch (error) {
      logger('error', ['Failed when getting ansattnummer from FINT', error.response?.data || error.stack || error.toString()])
      return httpResponse(500, error)
    }
  }

  // If simply getting with ansattnummer
  if (identifikator === 'ansattnummer') ansattnummer = identifikatorverdi

  try {
    const res = await fintEmployee(ansattnummer)
    if (!res) return httpResponse(404, `No employee with ansattnummer "${ansattnummer}" found in FINT`)
    return httpResponse(200, res)
  } catch (error) {
    logger('error', [error])
    return { status: 500, body: error.toString() }
  }
}
