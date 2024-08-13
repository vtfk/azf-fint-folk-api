module.exports = (feidenavn, includeStudentSsn) => {
  return {
    query: `
      query {
        skoleressurs(feidenavn: "${feidenavn}") {
          person {
            kontaktinformasjon {
              epostadresse
              mobiltelefonnummer
            }
          }
          personalressurs {
            ansattnummer {
              identifikatorverdi
            }
            kontaktinformasjon {
              epostadresse
              mobiltelefonnummer
            }
            person {
              fodselsnummer {
                identifikatorverdi
              }
              fodselsdato
              navn {
                fornavn
                mellomnavn
                etternavn
              }
              bostedsadresse {
                adresselinje
                postnummer
                poststed
              }
              kontaktinformasjon {
                epostadresse
                mobiltelefonnummer
              }
              kjonn {
                kode
              }
            }
          }
          feidenavn {
            identifikatorverdi
          }
          undervisningsforhold {
            systemId {
              identifikatorverdi
            }
            beskrivelse
            arbeidsforhold {
							systemId {
              identifikatorverdi
							}
							gyldighetsperiode {
								start
								slutt
							}
							arbeidsforholdsperiode {
								start
								slutt
							}
              arbeidsforholdstype {
                kode
                navn
              }
              ansettelsesprosent
              lonnsprosent
						}
            hovedskole
            skole {
              navn
              skolenummer {
                identifikatorverdi
              }
              organisasjonsnummer {
                identifikatorverdi
              }
              organisasjon {
                organisasjonsId {
                  identifikatorverdi
                }
                kortnavn
              }
            }
            basisgruppe {
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
              skole {
                navn
                skolenummer {
                  identifikatorverdi
                }
              }
              systemId {
                identifikatorverdi
              }
              trinn {
                navn
                grepreferanse
              }
              gruppemedlemskap {
                elevforhold {
                  elev {
                    person {
                      ${includeStudentSsn ? 'fodselsnummer { identifikatorverdi }' : ''}
                      navn {
                        fornavn
                        mellomnavn
                        etternavn
                      }
                    }
                    feidenavn {
                      identifikatorverdi
                    }
                    elevnummer {
                      identifikatorverdi
                    }
                  }
                  kontaktlarergruppe {
                    systemId {identifikatorverdi}
                  }
                }
              }
            }
            kontaktlarergruppe {
              navn
              termin {
                kode
                gyldighetsperiode { start slutt }
              }
              skolear {
                kode
                gyldighetsperiode { start slutt }
              }
              skole {
                navn
                skolenummer {
                  identifikatorverdi
                }
              }
              systemId {
                identifikatorverdi
              }
              undervisningsforhold {
                skoleressurs {
                  feidenavn {
                    identifikatorverdi
                  }
                }
              }
            }
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
                navn
                grepreferanse
              }
              skole {
                navn
                skolenummer {
                  identifikatorverdi
                }
              }
              systemId {
                identifikatorverdi
              }
              elevforhold {
                elev {
                  person {
                    ${includeStudentSsn ? 'fodselsnummer { identifikatorverdi }' : ''}
                    navn {
                      fornavn
                      mellomnavn
                      etternavn
                    }
                  }
                  feidenavn {
                    identifikatorverdi
                  }
                  elevnummer {
                    identifikatorverdi
                  }
                }
                kontaktlarergruppe {
                  systemId {
                    identifikatorverdi
                  }
                }
              }
              gruppemedlemskap {
                elevforhold {
                  elev {
                    person {
                      ${includeStudentSsn ? 'fodselsnummer { identifikatorverdi }' : ''}
                      navn {
                        fornavn
                        mellomnavn
                        etternavn
                      }
                    }
                    feidenavn {
                      identifikatorverdi
                    }
                  }
                  kontaktlarergruppe {
                    systemId {
                      identifikatorverdi
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
