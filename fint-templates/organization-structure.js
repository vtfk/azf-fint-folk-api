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
					underordnet {
						${base}
						underordnet {
							${base}
							underordnet {
								${base}
								underordnet {
									${base}
									underordnet {
										${base}
										underordnet {
											${base}
											underordnet {
												${base}
												underordnet {
													${base}
													underordnet {
														${base}
														underordnet {
															${base}
															underordnet {
																${base}
																underordnet {
																	${base}
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
