const graphQlOrganizationFlat = require('../fint-templates/organization-flat')
const { repackNavn, aktivPeriode } = require('./helpers/repack-fint')
const { topUnitId } = require('../config') 
const { fintGraph } = require('./requests/call-fint')
const { logger } = require('@vtfk/logger')

const repackOrganizationFlat = (unit, flat, level = 0) => {
  const gyldighetsperiode = { ...unit.gyldighetsperiode, aktiv: aktivPeriode(unit.gyldighetsperiode) }
  const leaderName = repackNavn(unit.leder?.person?.navn)
  const overordnetGyldighetsperiode = { ...unit.gyldighetsperiode, aktiv: aktivPeriode(unit.gyldighetsperiode) }
  const overordnet = {
    aktiv: overordnetGyldighetsperiode.aktiv,
    organisasjonsId: unit.overordnet.organisasjonsId.identifikatorverdi,
    gyldighetsperiode: overordnetGyldighetsperiode,
    navn: unit.overordnet.navn,
    kortnavn: unit.overordnet.kortnavn
  }
  unit.aktiv = gyldighetsperiode.aktiv
  unit.level = level
  unit.organisasjonsId = unit.organisasjonsId.identifikatorverdi
  unit.gyldighetsperiode = gyldighetsperiode
  unit.leder = {
    ansattnummer: unit.leder?.ansattnummer?.identifikatorverdi || null,
    navn: leaderName.fulltnavn,
    fornavn: leaderName.fornavn,
    etternavn: leaderName.etternavn
  }
  unit.overordnet = overordnet
  unit.underordnet = unit.underordnet.map(u => repackOrganizationFlat(u, flat, level + 1))
  delete unit.underordnet
  flat.push(unit)
  return flat
}

module.exports = async () => {
  logger('info', ['fintOrganization', 'Creating graph payload', 'flat'])
  const payload = graphQlOrganizationFlat()
  logger('info', ['fintOrganization', 'Created graph payload, sending request to FINT', 'flat'])
  const { data } = await fintGraph(payload)
  const raw = JSON.parse(JSON.stringify(data)) // We modify data when repacking, create a simple copy here
  if (!data.organisasjonselement?.organisasjonsId?.identifikatorverdi) {
    logger('info', ['fintOrganization', `No organization with organisasjonsId "${topUnitId}" found in FINT`])
    return null
  }
  logger('info', ['fintOrganization', 'Got response from FINT, repacking result', 'flat'])
  const flat = []
  const flattened = repackOrganizationFlat(data.organisasjonselement, flat) // Modifies the object directly
  logger('info', ['fintOrganization', 'Repacked result', 'flat'])

  return { repacked: flattened, raw }
}
