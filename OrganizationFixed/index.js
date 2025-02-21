const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/helpers/decode-access-token')
const httpResponse = require('../lib/requests/http-response')
const { roles } = require('../config')
const { getResponse, setResponse } = require('../lib/response-cache')
const { fintOrganizationFixedIdm } = require('../lib/fint-organization-fixed/idm')

module.exports = async function (context, req) {
  logConfig({
    prefix: 'azf-fint-folk - Organization'
  })
  logger('info', ['New Request. Validating token'], context)
  const decoded = decodeAccessToken(req.headers.authorization)
  if (!decoded.verified) {
    logger('warn', ['Token is not valid', decoded.msg], context)
    return httpResponse(401, decoded.msg)
  }
  logConfig({
    prefix: `azf-fint-folk - OrganizationFixed - ${decoded.appid}${decoded.upn ? ' - ' + decoded.upn : ''}`
  })
  logger('info', ['Token is valid, checking params'], context)
  if (!req.params) {
    logger('info', ['No params here...'], context)
    return httpResponse(400, 'Missing query params')
  }

  const { identifikator, identifikatorverdi } = req.params
  const validIdentifiers = ['organisasjonsId', 'organisasjonsKode', 'structure', 'flat', 'idm']
  if (!validIdentifiers.includes(identifikator)) return httpResponse(400, `Query param ${identifikator} is not valid - must be ${validIdentifiers.join(' or ')}`)

  logger('info', ['Validating role'], context)
  if (!decoded.roles.includes(roles.organizationRead) && !decoded.roles.includes(roles.readAll)) {
    logger('info', ['Missing required role for access'], context)
    return httpResponse(403, 'Missing required role for access')
  }
  logger('info', ['Role validated'], context)

  // Cache
  if (req.query.skipCache !== 'true') {
    const cachedResponse = getResponse(req.url, context)
    if (cachedResponse) return httpResponse(200, cachedResponse)
  }

  // If fixed idm-units are requested
  if (identifikator === 'idm') {
    try {
      // await teamsStatusAlert(context)
      const { rawValidationResult, exceptionRuleValidationResult, repackedFintUnitsResult } = await fintOrganizationFixedIdm(context)

      // Check if we should only validate
      if (identifikatorverdi === 'validate') {
        logger('info', ['Only validation requested, returning validation'], context)
        // Remove all validated units, don't need them right now :)

        if (rawValidationResult) delete rawValidationResult.validUnits
        if (repackedFintUnitsResult) delete repackedFintUnitsResult.resultingUnitsFlat
        if (repackedFintUnitsResult) delete repackedFintUnitsResult.resultingUnitsNested
        return httpResponse(200, { rawValidationResult, exceptionRuleValidationResult: exceptionRuleValidationResult || 'not run', repackedFintUnitsResult: repackedFintUnitsResult || 'not run' })
      }
      if (!(rawValidationResult?.valid && exceptionRuleValidationResult?.valid && repackedFintUnitsResult?.valid)) {
        logger('warn', ['Validation failed, returning 500 and error'], context)
        if (rawValidationResult) delete rawValidationResult.validUnits
        if (repackedFintUnitsResult) delete repackedFintUnitsResult.resultingUnitsFlat
        if (repackedFintUnitsResult) delete repackedFintUnitsResult.resultingUnitsNested
        return httpResponse(500, { customMessage: 'Validation failed - check errordata, or call OrganizationFixed/idm/validate', customData: { rawValidationResult, exceptionRuleValidationResult: exceptionRuleValidationResult || 'not run', repackedFintUnitsResult: repackedFintUnitsResult || 'not run' } })
      }
      logger('info', ['Validation passed, returning 200 and result (in embedded FINT format'], context)
      const resultingResponse = {
        _embedded: {
          _entries: repackedFintUnitsResult.resultingUnitsFlat
        },
        total_items: repackedFintUnitsResult.resultingUnitsFlat.length,
        offset: 0,
        size: repackedFintUnitsResult.resultingUnitsFlat.length
      }

      if (req.query.skipCache !== 'true') setResponse(req.url, resultingResponse, context) // Cache result
      return httpResponse(200, resultingResponse)
    } catch (error) {
      logger('error', ['Failed when fetching organization fixed from FINT', error.response?.data || error.stack || error.toString()], context)
      return httpResponse(500, error)
    }
  }

  return httpResponse(500, { customMessage: 'Not implemented', customData: { identifikator, identifikatorverdi } })

  /* Need to fix the ones below...
  // If all units are requested
  if (identifikator === 'structure') {
    try {
      const includeInactiveUnits = req.query.includeInactiveUnits === 'true'
      const res = await fintOrganizationStructure(includeInactiveUnits)
      if (!res) return httpResponse(404, `No organizationUnit with organisasjonsId "${topUnitId}" found in FINT`)
      const result = req.query.includeRaw === 'true' ? { ...res.repacked, raw: res.raw } : res.repacked
      if (!req.query.skipCache) setResponse(req.url, result, context) // Cache result
      return httpResponse(200, result)
    } catch (error) {
      logger('error', ['Failed when fetching organization structure from FINT', error.response?.data || error.stack || error.toString()], context)
      return httpResponse(500, error)
    }
  }

  // If all units are requested and flattened (array)
  if (identifikator === 'flat') {
    try {
      const res = await fintOrganizationFlat()
      if (req.query.includeInactiveUnits !== 'true') res.repacked = res.repacked.filter(unit => unit.aktiv && unit.overordnet.aktiv) // Filter out inactive units if not requested (in structure, this is done in the repack function)
      if (!res) return httpResponse(404, `No organizationUnit with organisasjonsId "${topUnitId}" found in FINT`)
      const result = req.query.includeRaw === 'true' ? { flat: res.repacked.reverse(), raw: res.raw } : res.repacked.reverse()
      if (!req.query.skipCache) setResponse(req.url, result, context) // Cache result
      return httpResponse(200, result)
    } catch (error) {
      logger('error', ['Failed when fetching flat organization structure from FINT', error.response?.data || error.stack || error.toString()], context)
      return httpResponse(500, error)
    }
  }

  try {
    const res = await fintOrganization(identifikator, identifikatorverdi)
    if (!res) return httpResponse(404, `No organizationUnit with ${identifikator} "${identifikatorverdi}" found in FINT`)
    if (req.query.includeInactiveEmployees !== 'true') res.repacked.arbeidsforhold = res.repacked.arbeidsforhold.filter(forhold => forhold.aktiv)
    const result = req.query.includeRaw === 'true' ? { ...res.repacked, raw: res.raw } : res.repacked
    if (!req.query.skipCache) setResponse(req.url, result, context) // Cache result
    return httpResponse(200, result)
  } catch (error) {
    logger('error', ['Failed when fetching organization from FINT', error.response?.data || error.stack || error.toString()], context)
    return httpResponse(500, error)
  }
  */
}
