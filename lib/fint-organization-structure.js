const graphQlOrganizationStructure = require('../fint-templates/organization-structure')
const { aktivPeriode, repackLeder } = require('./helpers/repack-fint')
const { topUnitId } = require('../config')
const { fintGraph } = require('./requests/call-fint')
const { logger } = require('@vtfk/logger')

const repackOrganizationStructure = (inputUnit, includeInactiveUnits, graphQlFlatUnits) => {
  // Sjekker om vi har slengt med graphQlFlatUnits - da bruker vi dataene fra den i stedet for fra input-unit
  let unit
  if (!graphQlFlatUnits) {
    unit = JSON.parse(JSON.stringify(inputUnit))
  } else {
    const unitData = graphQlFlatUnits.find(graphQlUnit => graphQlUnit.organisasjonsId.identifikatorverdi === inputUnit.organisasjonsId.identifikatorverdi)
    if (!unitData) throw new Error(`No corresponding unit with id ${inputUnit.organisasjonsId.identifikatorverdi} found in graphQlFlatUnits`)
    unit = JSON.parse(JSON.stringify(unitData))
  }
  delete unit.overordnet

  const gyldighetsperiode = { ...unit.gyldighetsperiode, aktiv: aktivPeriode(unit.gyldighetsperiode) }
  unit.aktiv = gyldighetsperiode.aktiv
  unit.organisasjonsId = unit.organisasjonsId.identifikatorverdi
  unit.organisasjonsKode = unit.organisasjonsKode.identifikatorverdi
  unit.gyldighetsperiode = gyldighetsperiode
  unit.leder = repackLeder(unit.leder)

  if (!Array.isArray(unit.underordnet)) unit.underordnet = []
  // Må sjekke om underordnet inneholder current unit of filtrere den vekk, fordi det er noe rart i FINT, som gjør at noen enheter er underordnet seg selv, og vil sende oss i evig loop om vi fortsetter...
  unit.underordnet = inputUnit.underordnet.filter(u => u.organisasjonsId.identifikatorverdi !== unit.organisasjonsId)
  unit.underordnet = unit.underordnet.map(u => repackOrganizationStructure(u, includeInactiveUnits, graphQlFlatUnits))
  if (!includeInactiveUnits) unit.underordnet = unit.underordnet.filter(u => u.aktiv) // Expensive, because am idiot
  return unit // Return to make sure the recursive function finishes before return
}

const fintOrganizationStructure = async (includeInactiveUnits, context) => {
  logger('info', ['fintOrganization', 'Creating graph payload', 'structure'], context)
  const payload = graphQlOrganizationStructure()
  logger('info', ['fintOrganization', 'Created graph payload, sending request to FINT', 'structure'], context)
  const { data } = await fintGraph(payload, context)
  const raw = JSON.parse(JSON.stringify(data)) // We modify data when repacking, create a simple copy here
  if (!data.organisasjonselement?.organisasjonsId?.identifikatorverdi) {
    logger('info', ['fintOrganization', `No organization with organisasjonsId "${topUnitId}" found in FINT`], context)
    return null
  }
  logger('info', ['fintOrganization', 'Got response from FINT, repacking result', 'structure'], context)
  const repacked = repackOrganizationStructure(data.organisasjonselement, includeInactiveUnits) // Modifies the object directly, but we return object in question because js, and easier to understand
  logger('info', ['fintOrganization', 'Repacked result', 'structure'], context)

  return { repacked, raw }
}

module.exports = { fintOrganizationStructure, repackOrganizationStructure }
