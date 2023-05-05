module.exports = (fodselsnummer) => {
  return {
    query: `
      query {
        person(fodselsnummer: "${fodselsnummer}") {
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
					postadresse {
						adresselinje
						postnummer
						poststed
					}
					statsborgerskap {
						kode
						navn
					}
					kommune {
						kode
						navn
						fylke {
							kode
							navn
						}
					}
					foreldreansvar {
						navn {
							fornavn
							mellomnavn
							etternavn
						}
						fodselsnummer {
							identifikatorverdi
						}
					}
					parorende {
						kontaktperson {
							kontaktinformasjon {
								epostadresse
								mobiltelefonnummer
								telefonnummer
							}
							navn {
								fornavn
								mellomnavn
								etternavn
							}
							fodselsnummer {
								identifikatorverdi
							}
						}
					}
					morsmal {
						kode
						navn
					}
					malform {
						kode
						navn
					}
					bilde
				}
			}
    `
  }
}
