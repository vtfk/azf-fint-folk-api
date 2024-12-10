module.exports = (ansattnummer) => {
  return {
    query: `
      query {
        personalressurs(ansattnummer: "${ansattnummer}") {
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
            fodselsnummer {
              identifikatorverdi
            }
						fodselsdato
						bostedsadresse {
              adresselinje
              postnummer
              poststed
            }
            kjonn {
              kode
            }
          }
          ansattnummer {
            identifikatorverdi
          }
          brukernavn {
            identifikatorverdi
          }
          ansettelsesperiode {
            start
            slutt
          }
          ansiennitet
          personalressurskategori {
            kode
            navn
          }
          kontaktinformasjon {
            epostadresse
            mobiltelefonnummer
          }
					`
					/* Fullmakt for ting til å kræsje...
					fullmakt {
						systemId {
							identifikatorverdi
						}
						gyldighetsperiode {
							start
							slutt
						}
						ansvar {
							kode
							navn
						}
						funksjon {
							kode
							navn
						}
 						rolle {
							navn {
								identifikatorverdi
							}
							beskrivelse
						}
					}
					*/
					 + `
          arbeidsforhold {
            systemId {
              identifikatorverdi
            }
            hovedstilling
            ansettelsesprosent
            lonnsprosent
            stillingsnummer
            stillingstittel
						stillingskode {
							kode
							navn
						}
						arbeidsforholdstype {
							kode
							navn
						}
            gyldighetsperiode {
              start
              slutt
            }
            arbeidsforholdsperiode {
              start
              slutt
            }
            ansvar {
							kode
							navn
						}
						funksjon {
							kode
							navn
						}
            arbeidssted {
							organisasjonsId {
								identifikatorverdi
							}
							kortnavn
							navn
							organisasjonsKode {
								identifikatorverdi
							}
							organisasjonsnummer {
								identifikatorverdi
							}
              postadresse {
                adresselinje
                postnummer
                poststed
              }
              kontaktinformasjon {
								epostadresse
								telefonnummer
							}
							leder {
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
							overordnet {
								kortnavn
								navn
								organisasjonsId {
									identifikatorverdi
								}
								organisasjonsKode {
									identifikatorverdi
								}
								leder {
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
								overordnet {
									kortnavn
									navn
									organisasjonsId {
										identifikatorverdi
									}
									organisasjonsKode {
										identifikatorverdi
									}
									leder {
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
								overordnet {
									kortnavn
									navn
									organisasjonsId {
										identifikatorverdi
									}
									organisasjonsKode {
										identifikatorverdi
									}
									leder {
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
								overordnet {
									kortnavn
									navn
									organisasjonsId {
										identifikatorverdi
									}
									organisasjonsKode {
										identifikatorverdi
									}
									leder {
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
								overordnet {
									kortnavn
									navn
									organisasjonsId {
										identifikatorverdi
									}
									organisasjonsKode {
										identifikatorverdi
									}
									leder {
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
								overordnet {
									kortnavn
									navn
									organisasjonsId {
										identifikatorverdi
									}
									organisasjonsKode {
										identifikatorverdi
									}
									leder {
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
									overordnet {
										kortnavn
										navn
										organisasjonsId {
											identifikatorverdi
										}
										organisasjonsKode {
											identifikatorverdi
										}
										leder {
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
										overordnet {
											kortnavn
											navn
											organisasjonsId {
												identifikatorverdi
											}
											organisasjonsKode {
												identifikatorverdi
											}
											leder {
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
											overordnet {
												kortnavn
												navn
												organisasjonsId {
													identifikatorverdi
												}
												organisasjonsKode {
													identifikatorverdi
												}
												leder {
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
												overordnet {
													kortnavn
													navn
													organisasjonsId {
														identifikatorverdi
													}
													organisasjonsKode {
														identifikatorverdi
													}
													leder {
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
													overordnet {
														kortnavn
														navn
														organisasjonsId {
															identifikatorverdi
														}
														organisasjonsKode {
															identifikatorverdi
														}
														leder {
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
						}
          }
        }
      }
    `
  }
}
