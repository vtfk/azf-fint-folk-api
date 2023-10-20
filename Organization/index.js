const { fintOrganization } = require('../lib/fint-organization')
const { fintOrganizationStructure } = require('../lib/fint-organization-structure')
const { fintOrganizationFlat } = require('../lib/fint-organization-flat')
const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/helpers/decode-access-token')
const httpResponse = require('../lib/requests/http-response')
const { roles, topUnitId } = require('../config')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-fint-folk - Organization',
  })
  logger('info', ['New Request. Validating token'], context)
  const decoded = decodeAccessToken(req.headers.authorization)
  if (!decoded.verified) {
    logger('warn', ['Token is not valid', decoded.msg], context)
    return httpResponse(401, decoded.msg)
  }
  logConfig({
    prefix: `azf-fint-folk - Organization - ${decoded.appid}${decoded.upn ? ' - ' + decoded.upn : ''}`,
  })
  logger('info', ['Token is valid, checking params'], context)
  if (!req.params) {
    logger('info', ['No params here...'], context)
    return httpResponse(400, 'Missing query params')
  }

  const { identifikator, identifikatorverdi } = req.params
  const validIdentifiers = ['organisasjonsId', 'organisasjonsKode', 'structure', 'flat']
  if (!validIdentifiers.includes(identifikator)) return httpResponse(400, `Query param ${identifikator} is not valid - must be ${validIdentifiers.join(' or ')}`)

  logger('info', ['Validating role'], context)
  if (!decoded.roles.includes(roles.organizationRead) && !decoded.roles.includes(roles.readAll)) {
    logger('info', ['Missing required role for access'], context)
    return httpResponse(403, 'Missing required role for access')
  }
  logger('info', ['Role validated'], context)

  // If all units are requested
  if (identifikator === 'structure') {
    try {
      const includeInactiveUnits = req.query.includeInactiveUnits === 'true'
      const res = await fintOrganizationStructure(includeInactiveUnits)
      if (!res) return httpResponse(404, `No organizationUnit with organisasjonsId "${topUnitId}" found in FINT`)
      const result = req.query.includeRaw === 'true' ? { ...res.repacked, raw: res.raw } : res.repacked
      return httpResponse(200, result)
    } catch (error) {
      logger('error', [error], context)
      return { status: 500, body: error.toString() }
    }
  }

  // If all units are requested and flattened (array)
  if (identifikator === 'flat') {
    try {
      const res = await fintOrganizationFlat()
      if (req.query.includeInactiveUnits !== 'true') res.repacked = res.repacked.filter(unit => unit.aktiv && unit.overordnet.aktiv)
      if (!res) return httpResponse(404, `No organizationUnit with organisasjonsId "${topUnitId}" found in FINT`)
      const result = req.query.includeRaw === 'true' ? { flat: res.repacked.reverse(), raw: res.raw } : res.repacked.reverse()
      return httpResponse(200, result)
    } catch (error) {
      logger('error', error.response?.data || error.stack || error.toString(), context)
      return { status: 500, body: error.toString() }
    }
  }

  try {
    const res = await fintOrganization(identifikator, identifikatorverdi)
    if (!res) return httpResponse(404, `No organizationUnit with ${identifikator} "${identifikatorverdi}" found in FINT`)
    if (req.query.includeInactiveEmployees !== 'true') res.repacked.arbeidsforhold = res.repacked.arbeidsforhold.filter(forhold => forhold.aktiv)
    const result = req.query.includeRaw === 'true' ? { ...res.repacked, raw: res.raw } : res.repacked
    return httpResponse(200, result)
  } catch (error) {
    logger('error', [error], context)
    return { status: 500, body: error.toString() }
  }
}
