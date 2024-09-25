const graphQlSchool = require('../fint-templates/school')
const { skoleElementIsAktiv, repackNavn, repackSkolear, repackTermin, repackAdresselinje } = require('./helpers/repack-fint')
const { fintGraph } = require('./requests/call-fint')
const { logger } = require('@vtfk/logger')

const repackStudent = (elevforhold) => {
  if (elevforhold.elevforhold) elevforhold = elevforhold.elevforhold // I gruppemedlemskap ligger elevforholdet inne i en prop som heter elevforhold...
  const name = repackNavn(elevforhold.elev.person.navn)
  const repackedStudent = {
    navn: name.fulltnavn,
    fornavn: name.fornavn,
    etternavn: name.etternavn,
    feidenavn: elevforhold.elev?.feidenavn?.identifikatorverdi || null,
    elevnummer: elevforhold.elev?.elevnummer?.identifikatorverdi || null,
    elevforholdId: elevforhold.systemId.identifikatorverdi
  }
  if (elevforhold.elev?.person?.fodselsnummer?.identifikatorverdi) repackedStudent.fodselsnummer = elevforhold.elev?.person?.fodselsnummer?.identifikatorverdi
  return repackedStudent
}

const repackSchool = (fintSchool, context) => {
  const school = {
    skolenummer: fintSchool.skole.skolenummer.identifikatorverdi,
    navn: fintSchool.skole.navn,
    organisasjonsnummer: fintSchool.skole.organisasjonsnummer.identifikatorverdi,
    postadresse: {
      adresselinje: repackAdresselinje(fintSchool.skole.postadresse?.adresselinje),
      postnummer: fintSchool.skole.postadresse?.postnummer || null,
      poststed: fintSchool.skole.postadresse?.poststed || null
    },
    forretningsadresse: {
      adresselinje: repackAdresselinje(fintSchool.skole.forretningsadresse?.adresselinje),
      postnummer: fintSchool.skole.forretningsadresse?.postnummer || null,
      poststed: fintSchool.skole.forretningsadresse?.poststed || null
    },
    organisasjon: {
      navn: fintSchool.skole.organisasjon?.navn || null,
      kortnavn: fintSchool.skole.organisasjon?.kortnavn || null,
      organisasjonsId: fintSchool.skole.organisasjon?.organisasjonsId?.identifikatorverdi || null,
      organisasjonsKode: fintSchool.skole.organisasjon?.organisasjonsKode?.identifikatorverdi || null,
      leder: {
        ansattnummer: fintSchool.skole.organisasjon?.leder?.ansattnummer?.identifikatorverdi || null,
        navn: fintSchool.skole.organisasjon?.leder?.person?.navn ? repackNavn(fintSchool.skole.organisasjon?.leder?.person.navn) : null
      }
    },
    elever: fintSchool.skole.elevforhold.map(elev => repackStudent(elev)),
    basisgrupper: [],
    undervisningsgrupper: []
  }
  for (const gruppe of fintSchool.skole.basisgruppe) {
    const termin = repackTermin(gruppe.termin)
    const skolear = repackSkolear(gruppe.skolear)
    school.basisgrupper.push({
      navn: gruppe.navn,
      systemId: gruppe.systemId.identifikatorverdi,
      aktiv: skoleElementIsAktiv(skolear, termin),
      trinn: gruppe.trinn.navn,
      termin,
      skolear,
      elever: gruppe.gruppemedlemskap.map(medlemskap => school.elever.find(elev => elev.elevforholdId === medlemskap.elevforhold?.systemId.identifikatorverdi) || { elevforholdId: medlemskap.elevforhold?.systemId.identifikatorverdi }).filter(elev => {
        if (!elev.navn) {
          logger('warn', [`elev not found for elevforholdId ${elev.elevforholdId}`], context)
          return false
        }
        return true
      })
    })
  }

  if (!fintSchool.skole.undervisningsgruppe) return school
  school.undervisningsgrupper = []
  for (const gruppe of fintSchool.skole.undervisningsgruppe) {
    const termin = repackTermin(gruppe.termin)
    const skolear = repackSkolear(gruppe.skolear)
    school.undervisningsgrupper.push({
      navn: gruppe.navn,
      systemId: gruppe.systemId.identifikatorverdi,
      aktiv: skoleElementIsAktiv(skolear, termin),
      fag: gruppe.fag,
      termin,
      skolear,
      elever: gruppe.elevforhold.map(forhold => school.elever.find(elev => elev.elevforholdId === forhold?.systemId.identifikatorverdi) || { elevforholdId: forhold.systemId.identifikatorverdi }).filter(elev => {
        if (!elev.navn) {
          logger('warn', [`elev not found for elevforholdId ${elev.elevforholdId}`], context)
          return false
        }
        return true
      })
    })
  }
  return school
}

const fintSchool = async (schoolNumber, includeUndervisningsgrupper, context) => {
  logger('info', ['fintSchool', 'Creating graph payload', 'schoolNumber', schoolNumber, 'includeUndervisningsgrupper', includeUndervisningsgrupper], context)
  const payload = graphQlSchool(schoolNumber, includeUndervisningsgrupper)
  logger('info', ['fintSchool', 'Created graph payload, sending request to FINT', 'schoolNumber', schoolNumber, 'includeUndervisningsgrupper', includeUndervisningsgrupper], context)
  const { data } = await fintGraph(payload, context)
  if (!data.skole?.navn) {
    logger('info', ['fintSchool', `No school with schoolNumber "${schoolNumber}" found in FINT`], context)
    return null
  }
  logger('info', ['Got response from FINT, repacking result', 'schoolNumber', schoolNumber], context)
  const repacked = repackSchool(data, context)
  logger('info', ['fintSchool', 'Repacked result - returning', 'schoolNumber', schoolNumber, 'includeUndervisningsgrupper', includeUndervisningsgrupper], context)

  return { repacked, raw: data }
}

module.exports = { fintSchool, repackSchool }
