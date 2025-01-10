const isEmail = (identifikator) => {
  return String(identifikator).toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)
}

const isGuid = (identifikator) => {
  return String(identifikator).match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/)
}

const isFnr = (identifikator) => {
  return Boolean(!isNaN(identifikator) && identifikator.length === 11)
}

const isAnsattnummer = (identifikator) => {
  return Boolean(!isNaN(identifikator) && identifikator.length < 20 && identifikator.length > 0) // Hakke peiling på hvor langt et ansattnummer kan være
}

module.exports = { isEmail, isFnr, isAnsattnummer, isGuid }
