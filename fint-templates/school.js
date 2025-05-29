module.exports = (schoolNumber, includeStudentSsn, includeUndervisningsgrupper) => {
  // Tabbed out for correct placement in the final query
  const undervisningsgruppeQuery = includeUndervisningsgrupper ? `
          undervisningsgruppe {
            navn
            termin {
              kode
              gyldighetsperiode {
                start
                slutt
              }
            }
            skolear {
              kode
              gyldighetsperiode { 
                start
                slutt
              }
            }
            fag {
              systemId {
                identifikatorverdi
              }
              navn
              grepreferanse
            }
            systemId {
              identifikatorverdi
            }
            elevforhold {
              systemId {identifikatorverdi}
            }
          }
        ` : ''
  return {
    query: `
      query {
        skole(skolenummer: "${schoolNumber}") {
          skolenummer {
            identifikatorverdi
          }
          navn
          organisasjonsnummer {
            identifikatorverdi
          }
          postadresse {
            adresselinje
            postnummer
            poststed
          }
          forretningsadresse {
            adresselinje
            postnummer
            poststed
          }
          organisasjon {
            navn
            kortnavn
            organisasjonsnavn
            organisasjonsId { identifikatorverdi }
            organisasjonsKode { identifikatorverdi }
            leder {
              ansattnummer { identifikatorverdi }
              person {
                navn {
                  fornavn
                  mellomnavn
                  etternavn
                }
              }
            }
          }
          elevforhold {
            systemId {
              identifikatorverdi
            }
            hovedskole
            elev {
              person {
                ${includeStudentSsn ? 'fodselsnummer { identifikatorverdi }' : ''}
                navn {
                  fornavn
                  mellomnavn
                  etternavn
                }
              }
              feidenavn { identifikatorverdi }
              elevnummer {
                identifikatorverdi
              }
            }
          }
          basisgruppe {
            systemId {
              identifikatorverdi
            }
            navn
            termin {
              kode
              gyldighetsperiode {
                start
                slutt
              }
            }
            skolear {
              kode
              gyldighetsperiode { 
                start
                slutt
              }
            }
            trinn {
              navn
              grepreferanse
            }
            gruppemedlemskap {
              elevforhold {
                systemId { identifikatorverdi }
              }
            }
          }
          ${undervisningsgruppeQuery}
        }
      } 
    `
  }
}
