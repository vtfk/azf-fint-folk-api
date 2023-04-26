module.exports = (feidenavn) => {
  return {
    query: `
      query {
        elev(feidenavn: "${feidenavn}") {
          person {
            navn {
              fornavn
              mellomnavn
              etternavn
            }
            kontaktinformasjon {
              epostadresse
              mobiltelefonnummer
              telefonnummer
            }
            fodselsdato
            fodselsnummer {
              identifikatorverdi
            }
            kjonn {
              kode
            }
            bostedsadresse {
              adresselinje
              postnummer
              poststed
            }
          }
          feidenavn {
            identifikatorverdi
          }
          elevforhold {
            skole {
              navn
            }
            hovedskole
            programomrade {
              utdanningsprogram {
                navn
              }
            }
            gyldighetsperiode {
              start
              slutt
            }
            basisgruppe {
              navn
              trinn {
                navn
              }
              termin {
                navn
              }
              skolear {
                navn
              }
              periode {
                start
                slutt
              }
              systemId {
                identifikatorverdi
              }
            }
            undervisningsgruppe {
              navn
              periode {
                start
                slutt
              }
              skolear {
                navn
              }
              skole {
                navn
              }
              systemId {
                identifikatorverdi
              }
            }
            kontaktlarergruppe {
              navn
              systemId {
                identifikatorverdi
              }
              undervisningsforhold {
                skoleressurs {
                  person {
                    fodselsnummer {
                      identifikatorverdi
                    }
                    navn {
                      fornavn
                      mellomnavn
                      etternavn
                    }
                    kontaktinformasjon {
                      epostadresse
                      mobiltelefonnummer
                      telefonnummer
                    }
                  }
                }
              }
            }
          }
        }
      }
    `
  }
}
