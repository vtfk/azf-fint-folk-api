const { topUnitId } = require('../config')

module.exports = () => {
	const base = `
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
	`
  return {
    query: `
      query {
        organisasjonselement(organisasjonsId: "${topUnitId}") {
					${base}
					overordnet {
						${base}
					}
					underordnet {
						overordnet {
							${base}
						}
						${base}
						underordnet {
							overordnet {
								${base}
							}
							${base}
							underordnet {
								overordnet {
									${base}
								}
								${base}
								underordnet {
									overordnet {
										${base}
									}
									${base}
									underordnet {
										overordnet {
											${base}
										}
										${base}
										underordnet {
											overordnet {
												${base}
											}
											${base}
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
