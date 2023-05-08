const graphQlPerson = require('../fint-templates/person')
const { repackNavn, repackAdresselinje, getAge } = require('./helpers/repack-fint')
const { fintGraph } = require('./requests/call-fint')
const { logger } = require('@vtfk/logger')

const repackPerson = (fintPerson) => {
  const name = repackNavn(fintPerson.person.navn)
  const person = {
    navn: name.fulltnavn,
    fornavn: name.fornavn,
    etternavn: name.etternavn,
    fodselsnummer: fintPerson.person.fodselsnummer?.identifikatorverdi || null,
    fodselsdato: fintPerson.person.fodselsdato || null,
    alder: getAge(fintPerson.person.fodselsdato),
    kjonn: fintPerson.person.kjonn.kode,
    privatEpostadresse: fintPerson.person.kontaktinformasjon?.epostadresse || null,
    privatMobiltelefonnummer: fintPerson.person.kontaktinformasjon?.mobiltelefonnummer || null,
    bostedsadresse: {
      adresselinje: repackAdresselinje(fintPerson.person.bostedsadresse?.adresselinje),
      postnummer: fintPerson.person.bostedsadresse?.postnummer || null,
      poststed: fintPerson.person.bostedsadresse?.poststed || null
    },
    postadresse: {
      adresselinje: repackAdresselinje(fintPerson.person.postadresse?.adresselinje),
      postnummer: fintPerson.person.postadresse?.postnummer || null,
      poststed: fintPerson.person.postadresse?.poststed || null
    },
    statsborgerskap: fintPerson.person.statsborgerskap || [],
    kommune: {
      kode: fintPerson.person.kommune?.kode || null,
      navn: fintPerson.person.kommune?.navn || null,
      fylke: {
        kode: fintPerson.person.kommune?.fylke?.kode || null,
        navn: fintPerson.person.kommune?.fylke?.navn || null
      }
    },
    morsmal: {
      kode: fintPerson.person.morsmal?.kode || null,
      navn: fintPerson.person.morsmal?.navn || null
    },
    malform: {
      kode: fintPerson.person.malform?.kode || null,
      navn: fintPerson.person.malform?.navn || null
    },
    bilde: fintPerson.person.bilde || null,
    foreldreansvar: 'Kommer forhåpentligvis',
    parorende: 'Kommer forhåpentligvis'
  }
  return person
}

module.exports = async (fodselsnummer) => {
  logger('info', ['fintPerson', 'Creating graph payload', 'fodselsnummer', fodselsnummer])
  const payload = graphQlPerson(fodselsnummer)
  logger('info', ['fintPerson', 'Created graph payload, sending request to FINT', 'fodselsnummer', fodselsnummer])
  const { data } = await fintGraph(payload)
  if (!data.person?.navn?.fornavn) {
    logger('info', ['fintPerson', `No employee with fodselsnummer "${fodselsnummer}" found in FINT`])
    return null
  }
  logger('info', ['fintPerson', 'Got response from FINT, repacking result', 'fodselsnummer', fodselsnummer])
  const repacked = repackPerson(data)
  return { repacked, raw: data }
}
