const { fintStudent } = require('../lib/fint-student')
const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/helpers/decode-access-token')
const httpResponse = require('../lib/requests/http-response')
const { isEmail, isFnr } = require('../lib/helpers/identifikator-type')
const { roles, studentUpnSuffix, feidenavnDomain } = require('../config')
const { fintGraph } = require('../lib/requests/call-fint')
const { getResponse, setResponse } = require('../lib/response-cache')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-fint-folk - Student'
  })
  logger('info', ['New Request. Validating token'], context)
  const decoded = decodeAccessToken(req.headers.authorization)
  if (!decoded.verified) {
    logger('warn', ['Token is not valid', decoded.msg], context)
    return httpResponse(401, decoded.msg)
  }
  logConfig({
    prefix: `azf-fint-folk - Student - ${decoded.appid}${decoded.upn ? ' - ' + decoded.upn : ''}`
  })
  logger('info', ['Token is valid, checking params'], context)
  if (!req.params) {
    logger('info', ['No params here...'], context)
    return httpResponse(400, 'Missing query params')
  }
  
  const { identifikator, identifikatorverdi } = req.params
  const validIdentifiers = ['feidenavn', 'fodselsnummer', 'upn']
  if (!validIdentifiers.includes(identifikator)) return httpResponse(400, `Query param ${identifikator} is not valid - must be ${validIdentifiers.join(' or ')}`)

  if (identifikator === 'feidenavn' && !isEmail(identifikatorverdi)) return httpResponse(400, '"feidenavn" must be valid email')
  if (identifikator === 'upn' && !isEmail(identifikatorverdi)) return httpResponse(400, '"upn" must be valid email')
  if (identifikator === 'fodselsnummer' && !isFnr(identifikatorverdi)) return httpResponse(400, 'Property "fodselsnummer" must be 11 characters')

  logger('info', ['Validating role'], context)
  if (!decoded.roles.includes(roles.studentRead) && !decoded.roles.includes(roles.readAll)) {
    logger('info', ['Missing required role for access'], context)
    return httpResponse(403, 'Missing required role for access')
  }
  logger('info', ['Role validated'], context)
  
  // Cache
  if (req.query.skipCache !== 'true') {
    const cachedResponse = getResponse(req.url, context)
    if (cachedResponse) return httpResponse(200, cachedResponse)
  }

  let feidenavn = null
  let elevnummer = null
  // If getting with upn
  if (identifikator === 'upn') {
    logger('info', ['Queryparam is type "upn", simply creating feidenavn from given upn'], context)
    try {
      if (!identifikatorverdi.endsWith(studentUpnSuffix)) throw new Error(`Student upn must end with ${studentUpnSuffix}`)
      const feidenavnPrefix = identifikatorverdi.substring(0, identifikatorverdi.indexOf('@'))
      feidenavn = `${feidenavnPrefix}${feidenavnDomain}`
      logger('info', [`Got feidenavn: ${feidenavn}`], context)
    } catch (error) {
      logger('error', ['Failed when constructing feidenavn', error.response?.data || error.stack || error.toString()], context)
      return httpResponse(500, error)
    }
  }

  // If getting with fnr and ignoring feidenavn
  if (identifikator === 'fodselsnummer' && req.query.useElevnummer === 'true') {
    logger('info', ['Queryparam is type "fodselsnummer", and  feidenavn from FINT'], context)
    try {
      const payload = {
        query: `
          query {
            person(fodselsnummer: "${identifikatorverdi}") {
              elev {
                elevnummer {
                  identifikatorverdi
                }
              }
            }
          }
        `
      }
      const { data } = await fintGraph(payload, context)
      elevnummer = data.person?.elev?.elevnummer?.identifikatorverdi
      if (!elevnummer) return httpResponse(404, 'No student with provided identificator found in FINT')
      logger('info', [`Got elevnummer: ${elevnummer}`], context)
    } catch (error) {
      logger('error', ['Failed when getting elevnummer from FINT', error.response?.data || error.stack || error.toString()], context)
      return httpResponse(500, error)
    }
  } else if (identifikator === 'fodselsnummer') { // If getting with fnr and fetching feidenavn
    logger('info', ['Queryparam is type "fodselsnummer", fetching feidenavn from FINT'], context)
    try {
      const payload = {
        query: `
          query {
            person(fodselsnummer: "${identifikatorverdi}") {
              elev {
                feidenavn {
                  identifikatorverdi
                }
              }
            }
          }
        `
      }
      const { data } = await fintGraph(payload, context)
      feidenavn = data.person?.elev?.feidenavn?.identifikatorverdi
      if (!feidenavn) return httpResponse(404, 'No student with provided identificator found in FINT')
      logger('info', [`Got feidenavn: ${feidenavn}`], context)
    } catch (error) {
      logger('error', ['Failed when getting feidenavn from FINT', error.response?.data || error.stack || error.toString()], context)
      return httpResponse(500, error)
    }
  }

  // If simply getting with feidenavn
  if (identifikator === 'feidenavn') feidenavn = identifikatorverdi

  try {
    const res = await fintStudent(feidenavn, elevnummer, context)
    if (!res) return httpResponse(404, 'No student with provided identificator found in FINT')
    const result = req.query.includeRaw === 'true' ? { ...res.repacked, raw: res.raw } : res.repacked
    if (req.query.skipCache !== 'true') setResponse(req.url, result, context) // Cache result
    return httpResponse(200, result)
  } catch (error) {
    logger('error', ['Failed when getting student from FINT', error.response?.data || error.stack || error.toString()], context)
    return httpResponse(500, error)
  }
}
