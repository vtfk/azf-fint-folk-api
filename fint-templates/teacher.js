module.exports = (feidenavn) => {
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
            }
          }
          feidenavn {
            identifikatorverdi
          }
          undervisningsforhold {
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
          personalressurs {
            ansattnummer {
              identifikatorverdi
            }
            person {
                bostedsadresse {
                adresselinje
                postnummer
                poststed
              }
            }
            ansettelsesperiode {
              start
              slutt
            }
            arbeidsforhold {
              systemId { identifikatorverdi }
              ansettelsesprosent
              gyldighetsperiode {
                start
                slutt
              }
            }
          }
        }
      }
    `
  }
}
