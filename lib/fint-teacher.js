const graphQlTeacher = require('../fint-templates/teacher')
const { skoleElementIsAktiv, repackNavn, repackSkolear, repackTermin, repackAdresselinje, repackSkole, repackMiniSkole, getAge, aktivPeriode } = require('./helpers/repack-fint')
const { fintGraph } = require('./requests/call-fint')
const { getUserFromSamAccount } = require('./requests/call-graph')
const { logger } = require('@vtfk/logger')

const repackStudent = (elevforhold, contactTeacherGroups) => {
  if (elevforhold.elevforhold) elevforhold = elevforhold.elevforhold // I gruppemedlemskap ligger elevforholdet inne i en prop som heter elevforhold...
  const name = repackNavn(elevforhold.elev.person.navn)
  const repackedStudent = {
    navn: name.fulltnavn,
    fornavn: name.fornavn,
    etternavn: name.etternavn,
    feidenavn: elevforhold.elev?.feidenavn?.identifikatorverdi || null,
    elevnummer: elevforhold.elev?.elevnummer?.identifikatorverdi || null,
    kontaktlarer: elevforhold.kontaktlarergruppe.some(group1 => contactTeacherGroups.some(group2 => group1.systemId.identifikatorverdi === group2.systemId))
  }
  if (elevforhold.elev?.person?.fodselsnummer?.identifikatorverdi) repackedStudent.fodselsnummer = elevforhold.elev?.person?.fodselsnummer?.identifikatorverdi
  return repackedStudent
}

const repackTeacher = (fintTeacher) => {
  const name = repackNavn(fintTeacher.skoleressurs.personalressurs.person.navn)
  const hovedskoleUndervisningsforhold = fintTeacher.skoleressurs.undervisningsforhold.find(f => f.hovedskole) || null // Sjekk om det finnes et undervisningsforholld som er tilknyttet hovedskole
  const teacher = {
    feidenavn: fintTeacher.skoleressurs.feidenavn.identifikatorverdi,
    ansattnummer: fintTeacher.skoleressurs.personalressurs?.ansattnummer.identifikatorverdi,
    upn: null,
    navn: name.fulltnavn,
    fornavn: name.fornavn,
    etternavn: name.etternavn,
    fodselsnummer: fintTeacher.skoleressurs.personalressurs?.person.fodselsnummer?.identifikatorverdi || null,
    fodselsdato: fintTeacher.skoleressurs.personalressurs?.person.fodselsdato || null,
    alder: getAge(fintTeacher.skoleressurs.personalressurs?.person.fodselsdato),
    kjonn: fintTeacher.skoleressurs.personalressurs?.person.kjonn?.kode || null,
    larerEpostadresse: fintTeacher.skoleressurs.person.kontaktinformasjon?.epostadresse || null, // Fra personobjektet knyttet til Visma InSchool
    larerMobiltelefonnummer: fintTeacher.skoleressurs.person.kontaktinformasjon?.mobiltelefonnummer || null, // Fra personobjektet knyttet til Visma InSchool
    kontaktEpostadresse: fintTeacher.skoleressurs.personalressurs?.kontaktinformasjon?.epostadresse || null, // Fra personalressurs (Visma HRM)
    kontaktMobiltelefonnummer: fintTeacher.skoleressurs.personalressurs?.kontaktinformasjon?.mobiltelefonnummer || null, // Fra personalressurs (Visma HRM)
    privatEpostadresse: fintTeacher.skoleressurs.personalressurs?.person.kontaktinformasjon?.epostadresse || null, // Fra personobjektet knyttet til Visma HRM
    privatMobiltelefonnummer: fintTeacher.skoleressurs.personalressurs?.person.kontaktinformasjon?.mobiltelefonnummer || null, // Fra personobjektet knyttet til Visma HRM
    bostedsadresse: {
      adresselinje: repackAdresselinje(fintTeacher.skoleressurs.personalressurs?.person.bostedsadresse?.adresselinje),
      postnummer: fintTeacher.skoleressurs.personalressurs?.person.bostedsadresse?.postnummer || null,
      poststed: fintTeacher.skoleressurs.personalressurs?.person.bostedsadresse?.poststed || null
    },
    azureOfficeLocation: null,
    hovedskole: hovedskoleUndervisningsforhold ? { navn: hovedskoleUndervisningsforhold.skole.navn, skolenummer: hovedskoleUndervisningsforhold.skole.skolenummer.identifikatorverdi } : null,
    undervisningsforhold: []
  }
  for (const forhold of fintTeacher.skoleressurs.undervisningsforhold) {
    const gyldighetsperiode = { ...forhold.arbeidsforhold.gyldighetsperiode, aktiv: aktivPeriode(forhold.arbeidsforhold.gyldighetsperiode) }
    const arbeidsforholdsperiode = { ...forhold.arbeidsforhold.arbeidsforholdsperiode, aktiv: aktivPeriode(forhold.arbeidsforhold.arbeidsforholdsperiode) }
    const aktiv = gyldighetsperiode.aktiv && arbeidsforholdsperiode.aktiv
    const undervisningsforhold = {
      systemId: forhold.systemId.identifikatorverdi,
      beskrivelse: forhold.beskrivelse,
      aktiv,
      arbeidsforhold: {
        arbeidsforholdstype: forhold.arbeidsforhold.arbeidsforholdstype,
        gyldighetsperiode,
        arbeidsforholdsperiode,
        ansettelsesprosent: forhold.arbeidsforhold.ansettelsesprosent,
        lonnsprosent: forhold.arbeidsforhold.lonnsprosent
      },
      skole: repackSkole(forhold.skole, teacher.hovedskole),
      basisgrupper: [],
      kontaktlarergrupper: [],
      undervisningsgrupper: []
    }
    for (const gruppe of forhold.kontaktlarergruppe) {
      if (gruppe.undervisningsforhold.find(f => f.skoleressurs.feidenavn.identifikatorverdi === teacher.feidenavn)) {
        const termin = repackTermin(gruppe.termin)
        const skolear = repackSkolear(gruppe.skolear)
        undervisningsforhold.kontaktlarergrupper.push({
          navn: gruppe.navn,
          systemId: gruppe.systemId.identifikatorverdi,
          aktiv: skoleElementIsAktiv(skolear, termin),
          periode: gruppe.periode,
          skole: repackMiniSkole(gruppe.skole, teacher.hovedskole),
          termin,
          skolear
        })
      }
    }
    for (const gruppe of forhold.basisgruppe) {
      const termin = repackTermin(gruppe.termin)
      const skolear = repackSkolear(gruppe.skolear)
      undervisningsforhold.basisgrupper.push({
        navn: gruppe.navn,
        systemId: gruppe.systemId.identifikatorverdi,
        aktiv: skoleElementIsAktiv(skolear, termin),
        periode: gruppe.periode,
        trinn: gruppe.trinn.navn,
        skole: repackMiniSkole(gruppe.skole, teacher.hovedskole),
        termin,
        skolear,
        elever: gruppe.gruppemedlemskap.map(medlem => repackStudent(medlem, undervisningsforhold.kontaktlarergrupper))
      })
    }
    for (const gruppe of forhold.undervisningsgruppe) {
      const termin = repackTermin(gruppe.termin)
      const skolear = repackSkolear(gruppe.skolear)
      undervisningsforhold.undervisningsgrupper.push({
        navn: gruppe.navn,
        systemId: gruppe.systemId.identifikatorverdi,
        aktiv: skoleElementIsAktiv(skolear, termin),
        fag: gruppe.fag,
        periode: gruppe.periode,
        skole: repackMiniSkole(gruppe.skole, teacher.hovedskole),
        termin,
        skolear,
        elever: gruppe.elevforhold.map(elev => repackStudent(elev, undervisningsforhold.kontaktlarergrupper))
      })
    }
    teacher.undervisningsforhold.push(undervisningsforhold)
  }
  return teacher
}

const fintTeacher = async (feidenavn, includeStudentSsn, context) => {
  logger('info', ['fintTeacher', 'Creating graph payload', 'feidenavn', feidenavn, 'includeStudentSsn', includeStudentSsn], context)
  const payload = graphQlTeacher(feidenavn, includeStudentSsn)
  logger('info', ['fintTeacher', 'Created graph payload, sending request to FINT', 'feidenavn', feidenavn, 'includeStudentSsn', includeStudentSsn], context)
  const { data } = await fintGraph(payload, context)
  if (!data.skoleressurs?.personalressurs?.person?.navn?.fornavn) {
    logger('info', ['fintTeacher', `No teacher with feidenavn "${feidenavn}" found in FINT`], context)
    return null
  }
  logger('info', ['Got response from FINT, repacking result', 'feidenavn', feidenavn], context)
  const repacked = repackTeacher(data)
  logger('info', ['fintTeacher', 'Repacked result - fetching AzureAd info', 'feidenavn', feidenavn, 'includeStudentSsn', includeStudentSsn], context)
  try {
    const aad = await getUserFromSamAccount(feidenavn.split('@')[0], context)
    if (aad.value && aad.value.length === 1) {
      logger('info', ['fintTeacher', 'Found user in AzureAd', 'feidenavn', feidenavn, 'includeStudentSsn', includeStudentSsn], context)
      const { userPrincipalName, officeLocation } = aad.value[0]
      repacked.upn = userPrincipalName || null
      repacked.azureOfficeLocation = officeLocation || null
    } else {
      logger('info', ['fintTeacher', 'Could not find user in AzureAd', 'feidenavn', feidenavn, 'includeStudentSsn', includeStudentSsn], context)
    }
  } catch (error) {
    if (error.response?.status === 404) {
      logger('info', ['fintTeacher', '404 - Could not find user in AzureAd', 'feidenavn', feidenavn, 'includeStudentSsn', includeStudentSsn], context)
    } else {
      throw error
    }
  }
  return { repacked, raw: data }
}

module.exports = { fintTeacher, repackTeacher }
