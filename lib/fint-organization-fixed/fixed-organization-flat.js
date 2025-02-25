const { logger } = require('@vtfk/logger')
const { repackOrganizationFlat } = require('../fint-organization-flat')
const { getFixedUnits } = require('./cached-idm-units')
const { topUnitId } = require('../../config')

const fixedOrganizationFlat = async (context) => {
  logger('info', ['fixedOrganizationFlat', 'Getting necessary data from fixed org and graphql', 'flat'], context)

  const { fixedOrgNested, graphQlFlat } = await getFixedUnits(context)

  // Så plukker vi ut fixedOrgNested elementet med topid, og sender det til repack (her bruker vi KUN en toppenhet)
  const topUnit = fixedOrgNested.find(unit => unit.organisasjonsId.identifikatorverdi === topUnitId)
  if (!topUnit) throw new Error(`No top unit with id ${topUnitId} found in fixedOrgNested`)

  logger('info', ['fixedOrganizationFlat', 'Got necessary data, repacking result', 'flat'], context)
  const flat = []
  repackOrganizationFlat(topUnit, flat, 0, graphQlFlat)
  logger('info', ['fintOrganization', 'Repacked result', 'flat'], context)

  return { repacked: flat, raw: graphQlFlat }
}

module.exports = { fixedOrganizationFlat }
