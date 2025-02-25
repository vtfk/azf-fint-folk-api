const { logger } = require('@vtfk/logger')
const { getFixedUnits } = require('./cached-idm-units')
const { topUnitId } = require('../../config')
const { repackOrganizationStructure } = require('../fint-organization-structure')

const fixedOrganizationStructure = async (includeInactiveUnits, context) => {
  logger('info', ['fixedOrganizationStructure', 'Getting necessary data from fixed org and graphql', 'structure'], context)

  const { fixedOrgNested, graphQlFlat } = await getFixedUnits(context)

  // Så plukker vi ut fixedOrgNested elementet med topid, og sender det til repack (her bruker vi KUN en toppenhet)
  const topUnit = fixedOrgNested.find(unit => unit.organisasjonsId.identifikatorverdi === topUnitId)
  if (!topUnit) throw new Error(`No top unit with id ${topUnitId} found in fixedOrgNested`)

  logger('info', ['fixedOrganizationStructure', 'Got necessary data, repacking result', 'structure'], context)
  const repacked = repackOrganizationStructure(topUnit, includeInactiveUnits, graphQlFlat)
  logger('info', ['fixedOrganizationStructure', 'Repacked result', 'structure'], context)

  return { repacked, raw: graphQlFlat }
}

module.exports = { fixedOrganizationStructure }
