module.exports = (identifikator, identifikatorverdi) => {
  return {
    query: `
      query {
        organisasjonselement(${identifikator}: "${identifikatorverdi}") {
					organisasjonsId {
						identifikatorverdi
					}
					organisasjonsKode {
						identifikatorverdi
					}
					gyldighetsperiode {
						start
						slutt
					}
					navn
					kortnavn
					kontaktinformasjon {
						epostadresse
						mobiltelefonnummer
						telefonnummer
						nettsted
					}
					postadresse {
						adresselinje
						postnummer
						poststed
					}
					organisasjonsnummer {
						identifikatorverdi
					}
					forretningsadresse {
						adresselinje
						postnummer
						poststed
					}
					organisasjonsnavn
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
					ansvar {
						kode
						navn
					}
					overordnet {
						organisasjonsId {
							identifikatorverdi
						}
						organisasjonsKode {
							identifikatorverdi
						}
						gyldighetsperiode {
							start
							slutt
						}
						navn
						kortnavn
					}
					underordnet {
						organisasjonsId {
							identifikatorverdi
						}
						organisasjonsKode {
							identifikatorverdi
						}
						gyldighetsperiode {
							start
							slutt
						}
						navn
						kortnavn
					}
					arbeidsforhold {
						systemId {
							identifikatorverdi
						}
						arbeidsforholdsperiode {
							start
							slutt
						}
						arbeidsforholdstype {
							kode
							navn
						}
						gyldighetsperiode {
							start
							slutt
						}
						stillingstittel
						personalressurs {
							ansattnummer {
								identifikatorverdi
							}
							ansettelsesperiode {
								start
								slutt
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
    `
  }
}
