const graphQlStudent = require('../fint-templates/student')
const { skoleElementIsAktiv, repackNavn, repackSkolear, repackTermin, repackAdresselinje, repackSkole, repackMiniSkole, getAge, aktivPeriode } = require('./helpers/repack-fint')
const { fintGraph } = require('./requests/call-fint')
const { getUserFromSamAccount } = require('./requests/call-graph')
const { logger } = require('@vtfk/logger')

const repackTeacher = (undervisningsforhold, contactTeachers) => {
  if (undervisningsforhold.undervisningsforhold) undervisningsforhold = undervisningsforhold.undervisningsforhold // I gruppemedlemskap ligger undervisningsforholdet inne i en prop som heter undervisningsforhold...
  const name = repackNavn(undervisningsforhold.skoleressurs?.personalressurs?.person?.navn)
  return {
    feidenavn: undervisningsforhold.skoleressurs?.feidenavn?.identifikatorverdi || null,
    ansattnummer: undervisningsforhold.skoleressurs?.personalressurs?.ansattnummer?.identifikatorverdi || null,
    navn: name.fulltnavn,
    fornavn: name.fornavn,
    etternavn: name.etternavn,
    kontaktlarer: contactTeachers.includes(undervisningsforhold.skoleressurs?.feidenavn?.identifikatorverdi)
  }
}

const repackStudent = (fintStudent) => {
  if (fintStudent.person) fintStudent = fintStudent.person // Searched by fnr, simply go a step in to use the same functionality as for feidenavn
  const name = repackNavn(fintStudent.elev.person.navn)
  const hovedskoleElevforhold = fintStudent.elev.elevforhold.find(f => f.hovedskole) || null // Sjekk om det finnes et undervisningsforholld som er tilknyttet hovedskole
  const student = {
    feidenavn: fintStudent.elev.feidenavn.identifikatorverdi,
    elevnummer: fintStudent.elev.elevnummer.identifikatorverdi,
    upn: null, // Hentes fra azure ad
    navn: name.fulltnavn,
    fornavn: name.fornavn,
    etternavn: name.etternavn,
    fodselsnummer: fintStudent.elev.person.fodselsnummer?.identifikatorverdi || null,
    fodselsdato: fintStudent.elev.person.fodselsdato || null,
    alder: getAge(fintStudent.elev.person.fodselsdato),
    kjonn: fintStudent.elev.person.kjonn?.kode || null,
    kontaktEpostadresse: fintStudent.elev.kontaktinformasjon?.epostadresse || null,
    kontaktMobiltelefonnummer: fintStudent.elev.kontaktinformasjon?.mobiltelefonnummer || null,
    privatEpostadresse: fintStudent.elev.person.kontaktinformasjon?.epostadresse || null,
    privatMobiltelefonnummer: fintStudent.elev.person.kontaktinformasjon?.mobiltelefonnummer || null,
    bostedsadresse: {
      adresselinje: repackAdresselinje(fintStudent.elev.person.bostedsadresse?.adresselinje),
      postnummer: fintStudent.elev.person.bostedsadresse?.postnummer || null,
      poststed: fintStudent.elev.person.bostedsadresse?.poststed || null
    },
    hybeladresse: {
      adresselinje: repackAdresselinje(fintStudent.elev.hybeladresse?.adresselinje),
      postnummer: fintStudent.elev.hybeladresse?.postnummer || null,
      poststed: fintStudent.elev.hybeladresse?.poststed || null
    },
    hovedskole: hovedskoleElevforhold ? { navn: hovedskoleElevforhold.skole.navn, skolenummer: hovedskoleElevforhold.skole.skolenummer.identifikatorverdi } : null,
    kontaktlarere: [],
    elevforhold: []
  }
  for (const forhold of fintStudent.elev.elevforhold) {
    const elevforhold = {
      systemId: forhold.systemId.identifikatorverdi,
      aktiv: null, // Settes under her
      beskrivelse: forhold.beskrivelse || null,
      avbruddsdato: forhold.avbruddsdato || null,
      gyldighetsperiode: { ...forhold.gyldighetsperiode, aktiv: aktivPeriode(forhold.gyldighetsperiode) },
      skole: repackSkole(forhold.skole, student.hovedskole),
      programomrade: forhold.programomrade, // Kommer kanskje endring her når programområde utgår, per nå må vi bruke denne
      kategori: forhold.kategori,
      basisgrupper: [],
      undervisningsgrupper: [],
      kontaktlarergrupper: []
    }
    // Sjekk om forholdet er innenfor gyldighetsperioden eller avbrutt
    elevforhold.aktiv = elevforhold.gyldighetsperiode.aktiv && new Date() > new Date(elevforhold.avbruddsdato)

    // Kontaktlærergrupper
    const contactTeachers = [] // Enklere håndtering for å sjekke om noen er kontaklærer i et elevforhold, fyller opp feidenavn på kontaktlærer når det itereres over hvert elevforhold
    for (const gruppe of forhold.kontaktlarergruppe) {
      const termin = repackTermin(gruppe.termin)
      const skolear = repackSkolear(gruppe.skolear)
      const aktiv = skoleElementIsAktiv(skolear, termin)
      elevforhold.kontaktlarergrupper.push({
        navn: gruppe.navn,
        systemId: gruppe.systemId.identifikatorverdi,
        aktiv,
        periode: gruppe.periode,
        skole: repackMiniSkole(gruppe.skole, student.hovedskole),
        termin,
        skolear,
        undervisningsforhold: gruppe.undervisningsforhold.map(larer => {
          const teacher = repackTeacher(larer, [larer.skoleressurs?.feidenavn?.identifikatorverdi])
          if (aktiv && teacher.feidenavn && !contactTeachers.includes(teacher.feidenavn)) {
            contactTeachers.push(teacher.feidenavn)
            student.kontaktlarere.push({ ...teacher, gruppe: gruppe.navn, skole: repackMiniSkole(gruppe.skole, student.hovedskole) })
          }
          return teacher
        })
      })
    }

    // Basisgrupper
    for (const medlemskap of forhold.basisgruppemedlemskap) {
      const gruppe = medlemskap.basisgruppe // Selve basisgruppen ligger inne i objektet for medlemskapet
      const termin = repackTermin(gruppe.termin)
      const skolear = repackSkolear(gruppe.skolear)
      elevforhold.basisgrupper.push({
        navn: gruppe.navn,
        systemId: gruppe.systemId.identifikatorverdi,
        aktiv: skoleElementIsAktiv(skolear, termin),
        periode: gruppe.periode,
        trinn: gruppe.trinn.navn,
        skole: repackMiniSkole(gruppe.skole, student.hovedskole),
        termin,
        skolear,
        undervisningsforhold: gruppe.undervisningsforhold.map(larer => repackTeacher(larer, contactTeachers))
      })
    }

    // Undervisningsgrupper
    for (const gruppe of forhold.undervisningsgruppe) {
      const termin = repackTermin(gruppe.termin)
      const skolear = repackSkolear(gruppe.skolear)
      elevforhold.undervisningsgrupper.push({
        navn: gruppe.navn,
        systemId: gruppe.systemId.identifikatorverdi,
        aktiv: skoleElementIsAktiv(skolear, termin),
        fag: gruppe.fag,
        periode: gruppe.periode,
        skole: repackMiniSkole(gruppe.skole, student.hovedskole),
        termin,
        skolear,
        undervisningsforhold: gruppe.undervisningsforhold.map(larer => repackTeacher(larer, contactTeachers))
      })
    }
    student.elevforhold.push(elevforhold)
  }
  return student
}

const fintStudent = async (feidenavn) => {
  logger('info', ['fintStudent', 'Creating graph payload', 'feidenavn', feidenavn])
  const payload = graphQlStudent(feidenavn)
  logger('info', ['fintStudent', 'Created graph payload, sending request to FINT', 'feidenavn', feidenavn])
  const { data } = await fintGraph(payload)
  if (!data.elev?.person?.navn?.fornavn) {
    logger('info', ['fintStudent', `No student with feidenavn "${feidenavn}" found in FINT`])
    return null
  }
  logger('info', ['fintStudent', 'Got response from FINT, repacking result', 'feidenavn', feidenavn])
  const repacked = repackStudent(data)
  logger('info', ['fintStudent', 'Repacked result - fetching AzureAd info', 'feidenavn', feidenavn])
  const aad = await getUserFromSamAccount(feidenavn.split('@')[0])
  if (aad.value && aad.value.length === 1) {
    logger('info', ['fintStudent', 'Found user in AzureAd', 'feidenavn', feidenavn])
    const { userPrincipalName } = aad.value[0]
    repacked.upn = userPrincipalName || null
  } else {
    logger('info', ['fintStudent', 'Could not find user in AzureAd', 'feidenavn', feidenavn])
  }

  return { repacked, raw: data }
}

module.exports = { fintStudent, repackStudent }
