const graphQlEmployee = require('../fint-templates/employee')
const { repackNavn, aktivPeriode, repackAdresselinje, createStruktur, getAge, getNarmesteLeder } = require('./helpers/repack-fint')
const { fintGraph } = require('./requests/call-fint')
const { getUserFromAnsattnummer } = require('./requests/call-graph')
const { logger } = require('@vtfk/logger')

const repackEmployee = (fintEmployee) => {
  const name = repackNavn(fintEmployee.personalressurs.person.navn)
  const employee = {
    ansattnummer: fintEmployee.personalressurs.ansattnummer.identifikatorverdi,
    upn: null, // Hentes fra azure
    aktiv: null,
    navn: name.fulltnavn,
    fornavn: name.fornavn,
    etternavn: name.etternavn,
    fodselsnummer: fintEmployee.personalressurs.person.fodselsnummer?.identifikatorverdi || null,
    fodselsdato: fintEmployee.personalressurs.person.fodselsdato || null,
    alder: getAge(fintEmployee.personalressurs.person.fodselsdato),
    kjonn: fintEmployee.personalressurs.person.kjonn?.kode || null,
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
    entraIdOfficeLocation: null,
    ansiennitet: fintEmployee.personalressurs.ansiennitet || null,
    ansettelsesperiode: { ...fintEmployee.personalressurs.ansettelsesperiode, aktiv: aktivPeriode(fintEmployee.personalressurs.ansettelsesperiode) },
    personalressurskategori: {
      kode: fintEmployee.personalressurs.personalressurskategori?.kode || null,
      navn: fintEmployee.personalressurs.personalressurskategori?.navn || null
    },
    arbeidsforhold: [],
    fullmakter: []
  }
  // Arbeidsforhold
  for (const forhold of fintEmployee.personalressurs.arbeidsforhold) {
    const gyldighetsperiode = { ...forhold.gyldighetsperiode, aktiv: aktivPeriode(forhold.gyldighetsperiode) }
    const arbeidsforholdsperiode = { ...forhold.arbeidsforholdsperiode, aktiv: aktivPeriode(forhold.arbeidsforholdsperiode) }
    const aktiv = gyldighetsperiode.aktiv && arbeidsforholdsperiode.aktiv
    const managerName = repackNavn(forhold.arbeidssted.leder?.person?.navn)
    const strukturlinje = createStruktur(forhold.arbeidssted)
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
      stillingskode: forhold.stillingskode,
      arbeidsforholdstype: forhold.arbeidsforholdstype,
      ansvar: forhold.ansvar,
      funksjon: forhold.funksjon,
      narmesteLeder: getNarmesteLeder(fintEmployee.personalressurs.ansattnummer.identifikatorverdi, strukturlinje) || {
        navn: null,
        kontaktEpostadresse: null,
        ansattnummer: null
      },
      arbeidssted: {
        organisasjonsId: forhold.arbeidssted.organisasjonsId.identifikatorverdi,
        kortnavn: forhold.arbeidssted.kortnavn,
        navn: forhold.arbeidssted.navn,
        organisasjonsKode: forhold.arbeidssted.organisasjonsKode.identifikatorverdi,
        leder: {
          navn: managerName.fulltnavn,
          kontaktEpostadresse: forhold.arbeidssted.leder?.kontaktinformasjon?.epostadresse || null,
          ansattnummer: forhold.arbeidssted.leder?.ansattnummer?.identifikatorverdi || null
        }
      },
      strukturlinje
    })
  }
  // Fullmakter (hvem kan man herske over! (denne tryner i fint... Skru på igjen når den fungerer))
  /*
  for (const fullmakt of fintEmployee.personalressurs.fullmakt) {
    const systemIdList = fullmakt.systemId.identifikatorverdi.split('--')
    const organisasjonsId = systemIdList.length > 1 ? systemIdList[systemIdList.length - 2] : systemIdList[0] // Ikke helt sikker på at det alltid er orgEnhet her altså...
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
  */
  employee.aktiv = employee.ansettelsesperiode.aktiv && employee.arbeidsforhold.some(forhold => forhold.aktiv)
  return employee
}

const fintEmployee = async (ansattnummer, context) => {
  logger('info', ['fintEmployee', 'Creating graph payload', 'ansattnummer', ansattnummer], context)
  const payload = graphQlEmployee(ansattnummer)
  logger('info', ['fintEmployee', 'Created graph payload, sending request to FINT', 'ansattnummer', ansattnummer], context)
  const { data } = await fintGraph(payload, context)
  if (!data.personalressurs?.person?.navn?.fornavn) {
    logger('info', ['fintEmployee', `No employee with ansattnummer "${ansattnummer}" found in FINT`], context)
    return null
  }
  logger('info', ['fintEmployee', 'Got response from FINT, repacking result', 'ansattnummer', ansattnummer], context)
  const repacked = repackEmployee(data)
  logger('info', ['fintEmployee', 'Repacked result - fetching AzureAd info', 'ansattnummer', ansattnummer], context)
  const aad = await getUserFromAnsattnummer(ansattnummer, context)
  if (aad.value && aad.value.length === 1) {
    logger('info', ['fintEmployee', 'Found user in AzureAd', 'ansattnummer', ansattnummer], context)
    const { userPrincipalName, officeLocation } = aad.value[0]
    repacked.upn = userPrincipalName || null
    repacked.entraIdOfficeLocation = officeLocation || null
  } else {
    logger('info', ['fintEmployee', 'Could not find user in AzureAd', 'ansattnummer', ansattnummer], context)
  }

  return { repacked, raw: data }
}

module.exports = { repackEmployee, fintEmployee }
