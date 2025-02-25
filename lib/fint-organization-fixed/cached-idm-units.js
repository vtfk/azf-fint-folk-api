const { logger } = require('@vtfk/logger')
const { fintOrganizationFixedIdm } = require('./idm')
const { responseCache: { ttl }, topUnitId } = require('../../config')
const Cache = require('file-system-cache').default
const graphQlOrganizationFlat = require('../../fint-templates/organization-flat')
const { fintGraph } = require('../requests/call-fint')

const idmOrgCache = Cache({
  basePath: './.idm-fixed-org-cache'
})

const repackGraphQlFlat = (unit, flat) => {
  // Må sjekke om underordnet inneholder current unit of filtrere den vekk, fordi det er noe rart i FINT, som gjør at noen enheter er underordnet seg selv, og vil sende oss i evig loop om vi fortsetter...
  if (Array.isArray(unit.underordnet)) {
    unit.underordnet = unit.underordnet.filter(u => u.organisasjonsId.identifikatorverdi !== unit.organisasjonsId) // Fjern referanse til seg selv, da det skaper evig loop...
    unit.underordnet = unit.underordnet.map(u => repackGraphQlFlat(u, flat))
    delete unit.underordnet
  }
  flat.push(unit)
  return unit
}

const getFixedUnits = async (context) => {
  // Henter fra cache eller fra FINT og setter i cache, for å slippe å hente hele tida. Får vel bruke standard ttl, for å ikke lage krøll...
  // Dataene herfra må deretter brukes i alle andre funksjoner som trenger dataene, blir dessverre mange steder... For lage litt funksjoner som fikser for å holde det konsistent. Men først lunsj - lunsj over

  const fixedOrgNestedKey = 'fixedIdmNested'
  const cachedOrgNested = idmOrgCache.getSync(fixedOrgNestedKey)
  const graphQlFlatKey = 'graphQlFlat'
  const cachedGraphQlFlat = idmOrgCache.getSync(graphQlFlatKey)

  if (cachedOrgNested && cachedGraphQlFlat) {
    logger('info', ['getFixedUnits', 'found valid values in cache, will use that instead of fetching new'], context)
    return { fixedOrgNested: cachedOrgNested, graphQlFlat: cachedGraphQlFlat }
  }
  // Hvis noe mangler generer vi det opp
  logger('info', ['getFixedUnits', 'Getting repacked fixed units from fintOrganizationFixedIdm'])
  const { repackedFintUnitsResult } = await fintOrganizationFixedIdm(context)
  if (!repackedFintUnitsResult) throw new Error('fintOrganizationFixedIdm failed - cannot return fixed units - check validate')
  if (!repackedFintUnitsResult.valid) throw new Error('fintOrganizationFixedIdm result was not valid - cannot return fixed units - check validate')
  idmOrgCache.setSync(fixedOrgNestedKey, repackedFintUnitsResult.resultingUnitsNested, ttl)

  logger('info', ['getFixedUnits', 'Got repacked fixed units from fintOrganizationFixedIdm, and set in cache'])

  // Så henter vi graphql flat, og setter det i cache også
  logger('info', ['getFixedUnits', 'Creating graph payload'])
  const payload = graphQlOrganizationFlat()
  logger('info', ['getFixedUnits', 'Created graph payload, sending request to FINT'])
  const { data } = await fintGraph(payload)
  if (!data.organisasjonselement?.organisasjonsId?.identifikatorverdi) {
    logger('info', ['getFixedUnits', `No organization with organisasjonsId "${topUnitId}" found in FINT`])
    throw new Error(`No organization with organisasjonsId "${topUnitId}" found in FINT`)
  }
  logger('info', ['getFixedUnits', 'Got response from FINT, repacking result to graphQlFlat format'])

  const graphQlFlat = []
  repackGraphQlFlat(data.organisasjonselement, graphQlFlat)
  idmOrgCache.setSync(graphQlFlatKey, graphQlFlat, ttl)
  logger('info', ['getFixedUnits', 'Repacked graphQlFlat result, and set in cache'])

  return { fixedOrgNested: repackedFintUnitsResult.resultingUnitsNested, graphQlFlat }
}

module.exports = { getFixedUnits }
