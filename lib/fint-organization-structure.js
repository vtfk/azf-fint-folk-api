const graphQlOrganizationStructure = require('../fint-templates/organization-structure')
const { repackNavn, aktivPeriode } = require('./helpers/repack-fint')
const { topUnitId } = require('../config') 
const { fintGraph } = require('./requests/call-fint')
const { logger } = require('@vtfk/logger')

const repackOrganization = (unit) => {
  const gyldighetsperiode = { ...unit.gyldighetsperiode, aktiv: aktivPeriode(unit.gyldighetsperiode) }
  const leaderName = repackNavn(unit.leder?.person?.navn)
  unit.aktiv = gyldighetsperiode.aktiv
  unit.organisasjonsId = unit.organisasjonsId.identifikatorverdi
  unit.gyldighetsperiode = gyldighetsperiode
  unit.leder = {
    ansattnummer: unit.leder?.ansattnummer?.identifikatorverdi || null,
    navn: leaderName.fulltnavn,
    fornavn: leaderName.fornavn,
    etternavn: leaderName.etternavn
  }
  unit.underordnet = unit.underordnet.map(u => repackOrganization(u))
  return unit // Return to make sure the recursive function finishes before return
}

// Lag en flat en og
module.exports = async () => {
  logger('info', ['fintOrganization', 'Creating graph payload', 'structure'])
  const payload = graphQlOrganizationStructure()
  logger('info', ['fintOrganization', 'Created graph payload, sending request to FINT', 'structure'])
  const { data } = await fintGraph(payload)
  const raw = JSON.parse(JSON.stringify(data)) // We modify data when repacking, create a simple copy here
  if (!data.organisasjonselement?.organisasjonsId?.identifikatorverdi) {
    logger('info', ['fintOrganization', `No organization with organisasjonsId "${topUnitId}" found in FINT`])
    return null
  }
  logger('info', ['fintOrganization', 'Got response from FINT, repacking result', 'structure'])
  const repacked = repackOrganization(data.organisasjonselement) // Modifies the object directly, but we return object in question because js, and easier to understand
  logger('info', ['fintOrganization', 'Repacked result', 'structure'])

  return { repacked, raw }
}
