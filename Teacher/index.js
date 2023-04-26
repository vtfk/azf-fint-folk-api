const fintTeacher = require('../lib/fint-teacher')
const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/decode-access-token')
const httpResponse = require('../lib/http-response')
const validateEmail = require('../lib/validate-email')
const { roles } = require('../config')
const { getFeidenavn } = require('../lib/call-graph')

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

  if (!req.params.feidenavn) {
    logger('info', ['Missing required query parameter "feidenavn"'])
    return httpResponse(400, 'Missing required query parameter "feidenavn')
  }

  if (req.params.feidenavn.toLowerCase() !== 'me' && !validateEmail(req.params.feidenavn)) {
    logger('info', ['Query parameter "feidenavn" must be valid email or "me"'])
    return httpResponse(400, 'Query parameter "feidenavn" must be valid email or "me"')
  }
  let feidenavn
  if (req.params.feidenavn.toLowerCase() !== 'me') {
    logger('info', ['Queryparameter is type "feidenavn", validating role'])
    if (!decoded.roles.includes(roles.teacherRead)) {
      logger('info', [`Missing required role for access`])
      return httpResponse(403, 'Missing required role for access')
    }
    logger('info', ['Role validated'])
    feidenavn = req.params.feidenavn
  } else {
    logger('info', ['Queryparameter is type "me", fetching feidenavn from AzureAd'])
    if (!decoded.oid) {
      logger('warn', ['Token is not valid, missing property "oid"'])
      return httpResponse(401, 'Token is not valid, missing property "oid"')
    }
    try {
      feidenavn = await getFeidenavn(decoded.oid)
      logger('info', [`Got feidenavn: ${feidenavn}`])
    } catch (error) {
      logger('error', ['Failed when getting feidenavn', error.response?.data || error.stack || error.toString()])
      return httpResponse(500, error)
    }
  }

  try {
    const res = await fintTeacher(feidenavn)
    if (!res) return httpResponse(404, `No teacher with feidenavn "${feidenavn}" found in FINT`)
    return httpResponse(200, res)
  } catch (error) {
    logger('error', [error])
    return { status: 500, body: error.toString() }
  }
}
