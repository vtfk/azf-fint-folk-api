const { logger } = require('@vtfk/logger')
const graphQlOrganization = require('../../fint-templates/organization')
const { fintGraph } = require('../requests/call-fint')
const { getFixedUnits } = require('./cached-idm-units')
const { repackOrganization } = require('../fint-organization')

const fixedOrganization = async (identifikator, identifikatorverdi, context) => {
  logger('info', ['fixedOrganization', 'Creating graph payload', identifikator, identifikatorverdi], context)
  const payload = graphQlOrganization(identifikator, identifikatorverdi)
  logger('info', ['fixedOrganization', 'Created graph payload, sending request to FINT', identifikator, identifikatorverdi], context)
  const { data } = await fintGraph(payload)
  if (!data.organisasjonselement?.organisasjonsId?.identifikatorverdi) {
    logger('info', ['fixedOrganization', `No organization with ${identifikator} "${identifikatorverdi}" found in FINT`], context)
    return null
  }
  logger('info', ['fixedOrganization', 'Got response from FINT, getting necessary data from fixed org and graphql', identifikator, identifikatorverdi], context)

  const { fixedOrgFlat, graphQlFlat } = await getFixedUnits(context)

  logger('info', ['fixedOrganization', 'Got necessary data from fixed org and graphql, repacking result', identifikator, identifikatorverdi], context)

  const repacked = repackOrganization(data, fixedOrgFlat, graphQlFlat)
  logger('info', ['fixedOrganization', 'Repacked result', identifikator, identifikatorverdi])

  return { repacked, raw: data }
}

module.exports = { fixedOrganization }
