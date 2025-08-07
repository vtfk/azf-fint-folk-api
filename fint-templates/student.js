module.exports = (feidenavn, elevnummer) => {
  if (!feidenavn && !elevnummer) throw new Error('Either feidenavn or elevnummer must be provided to fintStudent function')
  const identificator = feidenavn ? `feidenavn: "${feidenavn}"` : `elevnummer: "${elevnummer}"`
  return {
    query: `
      query {
        elev(${identificator}) {
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
            gyldighetsperiode {
              start
              slutt
            }
            kategori {
              kode
              navn
            }
            programomrademedlemskap {
              gyldighetsperiode { start slutt }
              programomrade {
                navn
                systemId {
                  identifikatorverdi
                }
                grepreferanse
                utdanningsprogram {
                  systemId {
                    identifikatorverdi
                  }
                  navn
                  grepreferanse
                }
              }
            }
            basisgruppemedlemskap {
              gyldighetsperiode { start slutt }
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
                      kontaktinformasjon {
                        epostadresse
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
            undervisningsgruppemedlemskap {
              gyldighetsperiode { start slutt }
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
                      kontaktinformasjon {
                        epostadresse
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
            faggruppemedlemskap {
              gyldighetsperiode { start slutt }
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
            kontaktlarergruppemedlemskap {
              gyldighetsperiode { start slutt }
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
                      kontaktinformasjon {
                        epostadresse
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
      }
    `
  }
}
