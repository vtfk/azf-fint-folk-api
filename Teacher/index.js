const { fintTeacher } = require('../lib/fint-teacher')
const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/helpers/decode-access-token')
const httpResponse = require('../lib/requests/http-response')
const { isEmail, isFnr } = require('../lib/helpers/identifikator-type')
const { roles } = require('../config')
const { getFeidenavn, getFeidenavnFromAnsattnummer } = require('../lib/requests/call-graph')
const { fintGraph } = require('../lib/requests/call-fint')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-fint-folk - Teacher',
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
    prefix: `azf-fint-folk - Teacher - ${decoded.appid}${decoded.upn ? ' - ' + decoded.upn : ''}`,
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
  const validIdentifiers = ['feidenavn', 'upn', 'fodselsnummer']
  if (!validIdentifiers.includes(identifikator)) return httpResponse(400, `Query param ${identifikator} is not valid - must be ${validIdentifiers.join(' or ')}`)

  if (identifikator === 'feidenavn' && !isEmail(identifikatorverdi)) return httpResponse(400, '"feidenavn" must be valid email')
  if (identifikator === 'upn' && !isEmail(identifikatorverdi)) return httpResponse(400, '"upn" must be valid email')
  if (identifikator === 'fodselsnummer' && !isFnr(identifikatorverdi)) return httpResponse(400, 'Property "fodselsnummer" must be 11 characters')

  logger('info', ['Validating role'])
  if (!decoded.roles.includes(roles.teacherRead)) {
    logger('info', ['Missing required role for access'])
    return httpResponse(403, 'Missing required role for access')
  }
  logger('info', ['Role validated'])

  let feidenavn
  // If getting with upn
  if (identifikator === 'upn') {
    logger('info', ['Queryparam is type "upn", fetching feidenavn from AzureAD'])
    try {
      feidenavn = await getFeidenavn(identifikatorverdi)
      logger('info', [`Got feidenavn: ${feidenavn}`])
    } catch (error) {
      logger('error', ['Failed when getting feidenavn from AzureAD', error.response?.data || error.stack || error.toString()])
      return httpResponse(500, error)
    }
  }

  // If getting with fnr
  if (identifikator === 'fodselsnummer') {
    logger('info', ['Queryparam is type "fodselsnummer", fetching ansattnummer from FINT and then feidenavn from Azure AD'])
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
      const ansattnummer = data.person?.personalressurs?.ansattnummer?.identifikatorverdi
      if (!ansattnummer) return httpResponse(404, `No teacher with fodselsnummer "${identifikatorverdi}" found in FINT`)
      const azureFeidenavnRes = await getFeidenavnFromAnsattnummer(ansattnummer)
      if (!azureFeidenavnRes) return httpResponse(404, `No teacher with fodselsnummer "${identifikatorverdi}" found in FINT`)
      feidenavn = azureFeidenavnRes.feidenavn
    } catch (error) {
      logger('error', ['Failed when getting feidenavn from FINT', error.response?.data || error.stack || error.toString()])
      return httpResponse(500, error)
    }
  }

  // If simply getting with feidenavn
  if (identifikator === 'feidenavn') feidenavn = identifikatorverdi

  try {
    const res = await fintTeacher(feidenavn)
    if (!res) return httpResponse(404, `No teacher with feidenavn "${feidenavn}" found in FINT`)
    const result = req.query.includeRaw === 'true' ? { ...res.repacked, raw: res.raw } : res.repacked
    return httpResponse(200, result)
  } catch (error) {
    logger('error', [error])
    return { status: 500, body: error.toString() }
  }
}
