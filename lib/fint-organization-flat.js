const graphQlOrganizationFlat = require('../fint-templates/organization-flat')
const { aktivPeriode, repackLeder } = require('./helpers/repack-fint')
const { topUnitId } = require('../config')
const { fintGraph } = require('./requests/call-fint')
const { logger } = require('@vtfk/logger')

const repackOrganizationFlat = (inputUnit, flat, level, graphQlFlatUnits) => {
  let unit
  if (!graphQlFlatUnits) {
    unit = JSON.parse(JSON.stringify(inputUnit))
  } else {
    const unitData = graphQlFlatUnits.find(graphQlUnit => graphQlUnit.organisasjonsId.identifikatorverdi === inputUnit.organisasjonsId.identifikatorverdi)
    if (!unitData) throw new Error(`No corresponding unit with id ${inputUnit.organisasjonsId.identifikatorverdi} found in graphQlFlatUnits`)
    unit = JSON.parse(JSON.stringify(unitData))
    // Get correct overordnet as well
    const actualOverordnetId = inputUnit._links.overordnet[0].href.split('/').pop()
    if (!actualOverordnetId) throw new Error(`No overordnet id found in overordnet href for unit with id ${inputUnit.organisasjonsId.identifikatorverdi}`)
    const actualOverordnet = graphQlFlatUnits.find(graphQlUnit => graphQlUnit.organisasjonsId.identifikatorverdi === actualOverordnetId)
    if (!unit.overordnet) throw new Error(`No corresponding overordnet unit with id ${actualOverordnetId} found for unit with id ${inputUnit.organisasjonsId.identifikatorverdi} in graphQlFlatUnits`)
    unit.overordnet = JSON.parse(JSON.stringify(actualOverordnet))
  }

  const gyldighetsperiode = { ...unit.gyldighetsperiode, aktiv: aktivPeriode(unit.gyldighetsperiode) }
  const overordnetGyldighetsperiode = { ...unit.overordnet.gyldighetsperiode, aktiv: aktivPeriode(unit.overordnet.gyldighetsperiode) }
  const overordnet = {
    aktiv: overordnetGyldighetsperiode.aktiv,
    organisasjonsId: unit.overordnet.organisasjonsId.identifikatorverdi,
    organisasjonsKode: unit.overordnet.organisasjonsKode.identifikatorverdi,
    gyldighetsperiode: overordnetGyldighetsperiode,
    navn: unit.overordnet.navn,
    kortnavn: unit.overordnet.kortnavn
  }
  unit.aktiv = gyldighetsperiode.aktiv
  unit.level = level
  unit.organisasjonsId = unit.organisasjonsId.identifikatorverdi
  unit.organisasjonsKode = unit.organisasjonsKode.identifikatorverdi
  unit.gyldighetsperiode = gyldighetsperiode
  unit.leder = repackLeder(unit.leder)
  unit.overordnet = overordnet

  if (!Array.isArray(unit.underordnet)) unit.underordnet = []
  // Må sjekke om underordnet inneholder current unit of filtrere den vekk, fordi det er noe rart i FINT, som gjør at noen enheter er underordnet seg selv, og vil sende oss i evig loop om vi fortsetter...
  unit.underordnet = inputUnit.underordnet.filter(u => u.organisasjonsId.identifikatorverdi !== unit.organisasjonsId)
  unit.underordnet = unit.underordnet.map(u => {
    return repackOrganizationFlat(u, flat, level + 1, graphQlFlatUnits) // Recursion
  })
  delete unit.underordnet // Don't need this anymore, we have the correct underordnet in the flat array
  flat.push(unit)
  return unit
}

const fintOrganizationFlat = async (context) => {
  logger('info', ['fintOrganization', 'Creating graph payload', 'flat'], context)
  const payload = graphQlOrganizationFlat()
  logger('info', ['fintOrganization', 'Created graph payload, sending request to FINT', 'flat'], context)
  const { data } = await fintGraph(payload)
  const raw = JSON.parse(JSON.stringify(data)) // We modify data when repacking, create a simple copy here
  if (!data.organisasjonselement?.organisasjonsId?.identifikatorverdi) {
    logger('info', ['fintOrganization', `No organization with organisasjonsId "${topUnitId}" found in FINT`], context)
    return null
  }
  logger('info', ['fintOrganization', 'Got response from FINT, repacking result', 'flat'], context)
  const flat = []
  repackOrganizationFlat(data.organisasjonselement, flat, 0) // Modifies the object directly
  logger('info', ['fintOrganization', 'Repacked result', 'flat'], context)

  return { repacked: flat, raw }
}

module.exports = { fintOrganizationFlat, repackOrganizationFlat }
