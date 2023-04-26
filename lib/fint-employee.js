const graphQlEmployee = require('../fint-templates/employee')
const { repackNavn, aktivPeriode, repackAdresselinje, createStruktur } = require('./repack-fint')
const { fintGraph } = require('./call-fint')
const { logger } = require('@vtfk/logger')

const repackEmployee = (fintEmployee) => {
  const name = repackNavn(fintEmployee.personalressurs.person.navn)
  const employee = {
    ansattnummer: fintEmployee.personalressurs.ansattnummer.identifikatorverdi,
    navn: name.fulltnavn,
    fornavn: name.fornavn,
    etternavn: name.etternavn,
    fodselsnummer: fintEmployee.personalressurs.person.fodselsnummer?.identifikatorverdi || null,
    privatEpostadresse: fintEmployee.personalressurs.person.kontaktinformasjon?.epostadresse || null,
    privatMobiltelefonnummer: fintEmployee.personalressurs.person.kontaktinformasjon?.mobiltelefonnummer || null,
    brukernavn: fintEmployee.personalressurs.brukernavn?.identifikatorverdi || null,
    kontaktEpostadresse: fintEmployee.personalressurs.kontaktinformasjon?.epostadresse || null,
    kontaktMobiltelefonnummer: fintEmployee.personalressurs.kontaktinformasjon?.mobiltelefonnummer || null,
    bostedsadresse: {
      adresselinje: repackAdresselinje(fintEmployee.personalressurs.person.bostedsadresse?.adresselinje),
      postnummer: fintEmployee.personalressurs.person.bostedsadresse?.postnummer || null,
      poststed: fintEmployee.personalressurs.person.bostedsadresse?.poststed || null
    },
    ansiennitet: fintEmployee.personalressurs.ansiennitet || null,
    ansettelsesperiode: { ...fintEmployee.personalressurs.ansettelsesperiode, aktiv: aktivPeriode(fintEmployee.personalressurs.ansettelsesperiode) },
    arbeidsforhold: [],
    fullmakter: []
  }
  // Arbeidsforhold
  for (const forhold of fintEmployee.personalressurs.arbeidsforhold) {
    const gyldighetsperiode = { ...forhold.gyldighetsperiode, aktiv: aktivPeriode(forhold.gyldighetsperiode) }
    const arbeidsforholdsperiode = { ...forhold.arbeidsforholdsperiode, aktiv: aktivPeriode(forhold.arbeidsforholdsperiode) }
    const aktiv = gyldighetsperiode.aktiv && arbeidsforholdsperiode.aktiv
    const managerName = repackNavn(forhold.arbeidssted.leder?.person?.navn)
    employee.arbeidsforhold.push({
      aktiv,
      systemId: forhold.systemId.identifikatorverdi,
      gyldighetsperiode,
      arbeidsforholdsperiode,
      hovedstilling: forhold.hovedstilling,
      ansettelsesprosent: forhold.ansettelsesprosent,
      lonnsprosent: forhold.lonnsprosent,
      stillingsnummer: forhold.stillingsnummer,
      stillingstittel: forhold.stillingstittel,
      ansvar: forhold.ansvar,
      funksjon: forhold.funksjon,
      arbeidssted: {
        organisasjonsId: forhold.arbeidssted.organisasjonsId.identifikatorverdi,
        kortnavn: forhold.arbeidssted.kortnavn,
        navn: forhold.arbeidssted.navn,
        organisasjonsKode: forhold.arbeidssted.organisasjonsKode.identifikatorverdi,
        leder: {
          navn: managerName.fulltnavn,
          ansattnummer: forhold.arbeidssted.leder?.ansattnummer?.identifikatorverdi || null
        }
      },
      strukturlinje: createStruktur(forhold.arbeidssted)
    })
  }
  // Fullmakter (hvem kan man herske over!)
  for (const fullmakt of fintEmployee.personalressurs.fullmakt) {
    const systemIdList = fullmakt.systemId.identifikatorverdi.split('--')
    const organisasjonsId = systemIdList.length > 1 ? systemIdList[systemIdList.length-2] : systemIdList[0] // Ikke helt sikker på at det alltid er orgEnhet her altså...
    const gyldighetsperiode = { ...fullmakt.gyldighetsperiode, aktiv: aktivPeriode(fullmakt.gyldighetsperiode) }
    employee.fullmakter.push({
      aktiv: gyldighetsperiode.aktiv,
      organisasjonsId,
      systemId: fullmakt.systemId.identifikatorverdi,
      gyldighetsperiode,
      ansvar: fullmakt.ansvar || null,
      funksjon: fullmakt.funksjon || null,
      rolle: fullmakt.rolle || null
    })
  }
  employee.aktiv = employee.ansettelsesperiode.aktiv && employee.arbeidsforhold.some(forhold => forhold.aktiv)
  return employee
}

module.exports = async (ansattnummer) => {
  logger('info', [`Creating graph payload`, 'ansattnummer', ansattnummer])
  const payload = graphQlEmployee(ansattnummer)
  logger('info', ['Created graph payload, sending request to FINT', 'ansattnummer', ansattnummer])
  const { data } = await fintGraph(payload)
  if (!data.personalressurs?.person?.navn?.fornavn) {
    logger('info', [`No employee with ansattnummer "${ansattnummer}" found in FINT`])
    return null
  }
  logger('info', ['Got response from FINT, repacking result', 'ansattnummer', ansattnummer])
  const repacked = repackEmployee(data)
  logger('info', ['Repacked result - success', 'ansattnummer', ansattnummer])
  return { repacked, raw: data }
}