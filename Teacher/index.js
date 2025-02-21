const { fintTeacher } = require('../lib/fint-teacher')
const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/helpers/decode-access-token')
const httpResponse = require('../lib/requests/http-response')
const { isEmail, isFnr, isGuid } = require('../lib/helpers/identifikator-type')
const { roles } = require('../config')
const { getFeidenavn, getFeidenavnFromAnsattnummer } = require('../lib/requests/call-graph')
const { fintGraph } = require('../lib/requests/call-fint')
const { getResponse, setResponse } = require('../lib/response-cache')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-fint-folk - Teacher'
  })
  logger('info', ['New Request. Validating token'], context)
  const decoded = decodeAccessToken(req.headers.authorization)
  if (!decoded.verified) {
    logger('warn', ['Token is not valid', decoded.msg], context)
    return httpResponse(401, decoded.msg)
  }
  logConfig({
    prefix: `azf-fint-folk - Teacher - ${decoded.appid}${decoded.upn ? ' - ' + decoded.upn : ''}`
  })
  logger('info', ['Token is valid, checking params'], context)
  if (!req.params) {
    logger('info', ['No params here...'], context)
    return httpResponse(400, 'Missing query params')
  }

  const { identifikator, identifikatorverdi } = req.params
  const validIdentifiers = ['feidenavn', 'upn', 'fodselsnummer']
  if (!validIdentifiers.includes(identifikator)) return httpResponse(400, `Query param ${identifikator} is not valid - must be ${validIdentifiers.join(' or ')}`)

  if (identifikator === 'feidenavn' && !isEmail(identifikatorverdi)) return httpResponse(400, '"feidenavn" must be valid email')
  if (identifikator === 'upn' && (!isEmail(identifikatorverdi) && !isGuid(identifikatorverdi))) return httpResponse(400, '"upn" must be valid email or guid')
  if (identifikator === 'fodselsnummer' && !isFnr(identifikatorverdi)) return httpResponse(400, 'Property "fodselsnummer" must be 11 characters')

  logger('info', ['Validating role'], context)
  if (!decoded.roles.includes(roles.teacherRead) && !decoded.roles.includes(roles.readAll)) {
    logger('info', ['Missing required role for access'], context)
    return httpResponse(403, 'Missing required role for access')
  }
  logger('info', ['Role validated'], context)

  // Cache
  if (req.query.skipCache !== 'true') {
    const cachedResponse = getResponse(req.url, context)
    if (cachedResponse) return httpResponse(200, cachedResponse)
  }

  let feidenavn
  // If getting with upn
  if (identifikator === 'upn') {
    logger('info', ['Queryparam is type "upn", fetching feidenavn from EntraID'], context)
    try {
      feidenavn = await getFeidenavn(identifikatorverdi, context)
      logger('info', [`Got feidenavn: ${feidenavn}`], context)
    } catch (error) {
      if (error.response?.status === 404) {
        logger('error', ['No user with provided upn found in EntraID', error.response?.data || error.stack || error.toString()], context)
        return httpResponse(404, 'No user with provided upn found in EntraID')
      }
      logger('error', ['Failed when getting feidenavn from EntraID', error.response?.data || error.stack || error.toString()], context)
      return httpResponse(500, error)
    }
  }

  // If getting with fnr
  if (identifikator === 'fodselsnummer') {
    logger('info', ['Queryparam is type "fodselsnummer", fetching ansattnummer from FINT and then feidenavn from Azure AD'], context)
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
      const { data } = await fintGraph(payload, context)
      const ansattnummer = data.person?.personalressurs?.ansattnummer?.identifikatorverdi
      if (!ansattnummer) return httpResponse(404, 'No teacher with provided identificator found in FINT')
      const azureFeidenavnRes = await getFeidenavnFromAnsattnummer(ansattnummer, context)
      if (!azureFeidenavnRes) return httpResponse(404, 'No teacher with provided identificator found in FINT')
      feidenavn = azureFeidenavnRes.feidenavn
    } catch (error) {
      logger('error', ['Failed when getting feidenavn from FINT', error.response?.data || error.stack || error.toString()], context)
      return httpResponse(500, error)
    }
  }

  // If simply getting with feidenavn
  if (identifikator === 'feidenavn') feidenavn = identifikatorverdi

  try {
    const includeStudentSsn = req.query.includeStudentSsn === 'true'
    const res = await fintTeacher(feidenavn, includeStudentSsn, context)
    if (!res) return httpResponse(404, 'No teacher with provided identificator found in FINT')
    const result = req.query.includeRaw === 'true' ? { ...res.repacked, raw: res.raw } : res.repacked
    if (req.query.skipCache !== 'true') setResponse(req.url, result, context) // Cache result
    return httpResponse(200, result)
  } catch (error) {
    logger('error', ['Failed when getting teacher from FINT', error.response?.data || error.stack || error.toString()], context)
    return httpResponse(500, error)
  }
}
