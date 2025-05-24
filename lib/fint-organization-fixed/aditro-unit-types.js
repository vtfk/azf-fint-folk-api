const { default: axios } = require('axios')
const { aditro: { apiUrl, topUnitId } } = require('../../config')
const getAditroToken = require('../requests/aditro-token')
const { logger } = require('@vtfk/logger')

/**
 * @typedef {Object} ProjectDimension6Hours
 * @property {string} id
 * @property {string} value
 * @property {string} description
 */

/**
 * @typedef {Object} SimpleAditroUnit
 * @property {string} lonnOrganizationId
 * @property {string} description
 * @property {ProjectDimension6Hours} projectDimension6Hours
 */

/**
 * @typedef {Map<string, SimpleAditroUnit>} AditroUnits
 */

/**
 *
 * @returns {Promise<AditroUnits>}
 * @throws {Error} If there are invalid or duplicate units
 */
const getAditroOrgUnits = async () => {
  const aditroToken = await getAditroToken()
  const aditroEndpoint = `${apiUrl}/organizations/CompanyNo/${topUnitId}?expandLookups=true`
  const { data } = await axios.get(aditroEndpoint, { headers: { Authorization: `Bearer ${aditroToken}` } })

  const duplicateUnits = []

  const aditroUnitMap = new Map()
  for (const unit of data) {
    const { lonnOrganizationId, description } = unit

    const projectDimension6Hours = unit.projectDimension6Hours || null

    if (!lonnOrganizationId || typeof lonnOrganizationId !== 'string') {
      logger('warn', ['Invalid aditro unit, missing or invalid lonnOrganizationId - skipping unit', unit])
      continue
    }

    if (aditroUnitMap.has(lonnOrganizationId)) {
      duplicateUnits.push({ lonnOrganizationId, description })
      continue
    }

    aditroUnitMap.set(lonnOrganizationId, {
      lonnOrganizationId,
      description,
      projectDimension6Hours
    })
  }
  if (duplicateUnits.length > 0) {
    const errorMsg = duplicateUnits.map((duplicateUnit) => `${duplicateUnit.lonnOrganizationId} - ${duplicateUnit.description}`).join('\n')
    throw new Error(`Aiai, duplicate aditro-units:\n${errorMsg}`)
  }
  return aditroUnitMap
}

/**
 * @typedef {Object} ProjectDimension6HoursResult
 * @property {ProjectDimension6Hours} projectDimension6Hours
 * @property {boolean} unitNotFound
 * @property {boolean} missingProjectDimension6Hours
 * @property {boolean} invalidProjectDimension6Hours
 */

/**
 *
 * @param {string} unitOrganisasjonsId
 * @param {AditroUnits} aditroUnits
 * @returns {ProjectDimension6HoursResult} The projectDimension6Hours for the given unitOrganisasjonsId
 */
const getAditroProjectDimension6Hours = (unitOrganisasjonsId, aditroUnits) => {
  if (!unitOrganisasjonsId || typeof unitOrganisasjonsId !== 'string') {
    throw new Error('unitOrganisasjonsId must be a valid string')
  }
  if (!aditroUnits || !(aditroUnits instanceof Map)) {
    throw new Error('invalid aditroUnits, must be a Map')
  }
  const result = {
    projectDimension6Hours: {
      id: 'ukjent',
      value: 'ukjent',
      description: 'Ukjent'
    },
    unitNotFound: false,
    missingProjectDimension6Hours: false,
    invalidProjectDimension6Hours: false
  }
  const aditroUnit = aditroUnits.get(unitOrganisasjonsId)
  if (!aditroUnit) {
    result.unitNotFound = true
    return result
  }
  if (!aditroUnit.projectDimension6Hours) {
    result.missingProjectDimension6Hours = true
    return result
  }
  for (const key of ['id', 'value', 'description']) {
    if (!aditroUnit.projectDimension6Hours[key] || typeof aditroUnit.projectDimension6Hours[key] !== 'string' || aditroUnit.projectDimension6Hours[key].trim().length === 0) {
      result.invalidProjectDimension6Hours = true
      return result
    }
  }
  result.projectDimension6Hours = aditroUnit.projectDimension6Hours
  return result
}

module.exports = { getAditroOrgUnits, getAditroProjectDimension6Hours }
