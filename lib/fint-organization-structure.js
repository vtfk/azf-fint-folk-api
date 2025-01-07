const graphQlOrganizationStructure = require('../fint-templates/organization-structure')
const { repackNavn, aktivPeriode } = require('./helpers/repack-fint')
const { topUnitId } = require('../config')
const { fintGraph } = require('./requests/call-fint')
const { logger } = require('@vtfk/logger')

const repackOrganizationStructure = (unit, includeInactiveUnits) => {
  const gyldighetsperiode = { ...unit.gyldighetsperiode, aktiv: aktivPeriode(unit.gyldighetsperiode) }
  const leaderName = repackNavn(unit.leder?.person?.navn)
  unit.aktiv = gyldighetsperiode.aktiv
  unit.organisasjonsId = unit.organisasjonsId.identifikatorverdi
  unit.organisasjonsKode = unit.organisasjonsKode.identifikatorverdi
  unit.gyldighetsperiode = gyldighetsperiode
  unit.leder = {
    ansattnummer: unit.leder?.ansattnummer?.identifikatorverdi || null,
    navn: leaderName.fulltnavn,
    fornavn: leaderName.fornavn,
    etternavn: leaderName.etternavn
  }

  // TEMP fix. Current unit might be missing shortname and leader info from FINT. Right now we can find correct data in underordnet with id === currentUnitId+'00'. We check if data is missing, and then add data from underordnet if it exists there.
  /* Some units does not fit the fix... waiting for HR to fix their data
  if (!unit.kortnavn || !unit.leder.ansattnummer) {
    const correspondingUnit = unit.underordnet.find(u => u.organisasjonsId.identifikatorverdi === `${unit.organisasjonsId}00`)
    if (correspondingUnit) {
      logger('info', ['fintOrganization', 'Found corresponding unit in underordnet', 'unit', unit.organisasjonsId, unit.navn, 'correspondingUnit', correspondingUnit.organisasjonsId.identifikatorverdi, correspondingUnit.navn])
      unit.kortnavn = unit.kortnavn || correspondingUnit.kortnavn || null // If current unit is missing shortname, use shortname from corresponding unit, else use null
      if (!unit.leder.ansattnummer) {
        if (correspondingUnit.leder?.ansattnummer?.identifikatorverdi) {
          const leaderNameFromCorrespondingUnit = repackNavn(correspondingUnit.leder?.person?.navn)
          unit.leder = {
            ansattnummer: correspondingUnit.leder.ansattnummer.identifikatorverdi,
            navn: leaderNameFromCorrespondingUnit.fulltnavn,
            fornavn: leaderNameFromCorrespondingUnit.fornavn,
            etternavn: leaderNameFromCorrespondingUnit.etternavn
          }
        }
      }
    }
  }
  */

  if (!Array.isArray(unit.underordnet)) logger('warn', ['OIOIOIO, underordnet is not an array', 'id:', unit.organisasjonsId, 'navn:', unit.navn])
  if (!Array.isArray(unit.underordnet)) unit.underordnet = []
  // Må sjekke om underordnet inneholder current unit of filtrere den vekk, fordi det er noe rart i FINT, som gjør at noen enheter er underordnet seg selv, og vil sende oss i evig loop om vi fortsetter...
  unit.underordnet = unit.underordnet.filter(u => u.organisasjonsId.identifikatorverdi !== unit.organisasjonsId)
  unit.underordnet = unit.underordnet.map(u => repackOrganizationStructure(u, includeInactiveUnits))
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
