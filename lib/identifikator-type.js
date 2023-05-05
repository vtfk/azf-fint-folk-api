const isEmail = (identifikator) => {
  return String(identifikator).toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)
}

const isFnr = (identifikator) => {
  return Boolean(!isNaN(identifikator) && identifikator.length === 11)
}

const isAnsattnummer = (identifikator) => {
  return Boolean(!isNaN(identifikator) && identifikator.length < 10 && identifikator.length > 6) // Hakke peiling på hvor langt et ansattnummer kan være
}

module.exports = { isEmail, isFnr, isAnsattnummer }
