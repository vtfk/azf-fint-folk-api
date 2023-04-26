const fintEmployee = require('../lib/fint-employee')
const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/decode-access-token')
const httpResponse = require('../lib/http-response')
const validateEmail = require('../lib/validate-email')
const { roles } = require('../config')
const { getAnsattnummer } = require('../lib/call-graph')

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

  if (!req.params.ansattnummer) {
    logger('info', ['Missing required query parameter "ansattnummer"'])
    return httpResponse(400, 'Missing required query parameter "ansattnummer')
  }

  if (req.params.ansattnummer.toLowerCase() !== 'me' && isNaN(req.params.ansattnummer)) {
    logger('info', ['Query parameter "ansattnummer" must be a number or "me"'])
    return httpResponse(400, 'Query parameter "ansattnummer" must be a number or "me"')
  }
  let ansattnummer
  if (req.params.ansattnummer.toLowerCase() !== 'me') {
    logger('info', ['Queryparameter is type "feidenavn", validating role'])
    if (!decoded.roles.includes(roles.employeeRead)) {
      logger('info', [`Missing required role for access`])
      return httpResponse(403, 'Missing required role for access')
    }
    logger('info', ['Role validated'])
    ansattnummer = req.params.ansattnummer
  } else {
    logger('info', ['Queryparameter is type "me", fetching ansattnummer from AzureAd'])
    if (!decoded.oid) {
      logger('info', ['Token is not valid, missing property "oid"'])
      return httpResponse(401, 'Token is not valid, missing property "oid"')
    }
    try {
      ansattnummer = await getAnsattnummer(decoded.oid)
      logger('info', [`Got ansattnummer: ${ansattnummer}`])
    } catch (error) {
      logger('error', ['Failed when getting ansattnummer', error.response?.data || error.stack || error.toString()])
      return httpResponse(500, error)
    }
  }

  try {
    const res = await fintEmployee(ansattnummer)
    if (!res) return httpResponse(404, `No employee with ansattnummer "${ansattnummer}" found in FINT`)
    return httpResponse(200, res)
  } catch (error) {
    logger('error', [error])
    return { status: 500, body: error.toString() }
  }
}
