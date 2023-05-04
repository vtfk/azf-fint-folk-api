const graphToken = require('./graph-token')
const axios = require('axios').default
const { graphUrl, feidenavnDomain, employeeNumberExtenstionAttribute } = require('../config')

const getFeidenavn = async (upn) => {
  const accessToken = await graphToken()
  const { data } = await axios.get(`${graphUrl}/users/${upn}?$select=onPremisesSamAccountName`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!data.onPremisesSamAccountName) throw new Error(`Could not find onPremisesSamAccountName for "${upn}"`)
  return `${data.onPremisesSamAccountName}${feidenavnDomain}`
}

const getAnsattnummer = async (upn) => {
  const accessToken = await graphToken()
  const { data } = await axios.get(`${graphUrl}/users/${upn}?$select=onPremisesExtensionAttributes`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!data.onPremisesExtensionAttributes) throw new Error(`Could not find onPremisesExtensionAttributes for "${upn}"`)
  if (!data.onPremisesExtensionAttributes[employeeNumberExtenstionAttribute]) throw new Error(`Could not find onPremisesExtensionAttributes.${employeeNumberExtenstionAttribute} for "${upn}"`)
  return data.onPremisesExtensionAttributes[employeeNumberExtenstionAttribute]
}

const getUserFromSamAccount = async (samAccount) => {
  const accessToken = await graphToken()
  const { data } = await axios.get(`${graphUrl}/users?$count=true&$filter=onPremisesSamAccountName eq '${samAccount}'`, { headers: { Authorization: `Bearer ${accessToken}`, ConsistencyLevel: 'eventual' } })
  return data
}

const getUserFromAnsattnummer = async (ansattnummer) => {
  const accessToken = await graphToken()
  const { data } = await axios.get(`${graphUrl}/users?$count=true&$filter=onPremisesExtensionAttributes/${employeeNumberExtenstionAttribute}+eq+'${ansattnummer}'`, { headers: { Authorization: `Bearer ${accessToken}`, ConsistencyLevel: 'eventual' } })
  return data
}

module.exports = { getFeidenavn, getAnsattnummer, getUserFromSamAccount, getUserFromAnsattnummer }