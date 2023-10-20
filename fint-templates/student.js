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
          elevnummer {
            identifikatorverdi
          }
          kontaktinformasjon {
            epostadresse
            mobiltelefonnummer
          }
          hybeladresse {
            adresselinje
            poststed
            postnummer
          }
          elevforhold {
            systemId {
              identifikatorverdi
            }
            avbruddsdato
            gyldighetsperiode {
              start
              slutt
            }
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
            hovedskole
            programomrade {
              navn
              systemId {
                identifikatorverdi
              }
              utdanningsprogram {
                systemId {
                  identifikatorverdi
                }
                navn
                grepreferanse
              }
            }
            gyldighetsperiode {
              start
              slutt
            }
            kategori {
              kode
              navn
            }
            basisgruppemedlemskap {
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
                undervisningsforhold {
                  skoleressurs {
                    feidenavn {
                      identifikatorverdi
                    }
                    personalressurs {
                      ansattnummer {
                        identifikatorverdi
                      }
                      person {
                        navn {
                          fornavn
                          mellomnavn
                          etternavn
                        }
                      }
                    }
                  }
                }
              }
            }
            undervisningsgruppe {
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
              undervisningsforhold {
                skoleressurs {
                  feidenavn {
                    identifikatorverdi
                  }
                  personalressurs {
                    ansattnummer {
                      identifikatorverdi
                    }
                    person {
                      navn {
                        fornavn
                        mellomnavn
                        etternavn
                      }
                    }
                  }
                }
              }
            }
            faggruppemedlemskap {
							faggruppe {
								navn
								systemId {
									identifikatorverdi
								}
								fag {
									systemId {
										identifikatorverdi
									}
									navn
									grepreferanse
								}
							}
						}
            kontaktlarergruppe {
              navn
              systemId {
                identifikatorverdi
              }
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
              undervisningsforhold {
                skoleressurs {
                  feidenavn {
                    identifikatorverdi
                  }
                  personalressurs {
                    ansattnummer {
                      identifikatorverdi
                    }
                    person {
                      navn {
                        fornavn
                        mellomnavn
                        etternavn
                      }
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
