const graphToken = require('./graph-token')
const axios = require('axios')
const { graphUrl, feidenavnDomain, employeeNumberExtenstionAttribute, studentUpnSuffix } = require('../../config')

const getFeidenavn = async (upn, context) => {
  const accessToken = await graphToken(context)
  const { data } = await axios.get(`${graphUrl}/users/${upn}?$select=onPremisesSamAccountName`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!data.onPremisesSamAccountName) throw new Error(`Could not find onPremisesSamAccountName for "${upn}"`)
  return `${data.onPremisesSamAccountName}${feidenavnDomain}`
}

const getAnsattnummer = async (upn, context) => {
  const accessToken = await graphToken(context)
  const { data } = await axios.get(`${graphUrl}/users/${upn}?$select=onPremisesExtensionAttributes`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!data.onPremisesExtensionAttributes) throw new Error(`Could not find onPremisesExtensionAttributes for "${upn}"`)
  if (!data.onPremisesExtensionAttributes[employeeNumberExtenstionAttribute]) throw new Error(`Could not find onPremisesExtensionAttributes.${employeeNumberExtenstionAttribute} for "${upn}"`)
  return data.onPremisesExtensionAttributes[employeeNumberExtenstionAttribute]
}

const getUserFromSamAccount = async (samAccount, context) => {
  const accessToken = await graphToken(context)
  const { data } = await axios.get(`${graphUrl}/users?$count=true&$filter=onPremisesSamAccountName eq '${samAccount}'`, { headers: { Authorization: `Bearer ${accessToken}`, ConsistencyLevel: 'eventual' } })
  return data
}

const getStudentFromFeidenavn = async (feidenavn, context) => {
  const upnPrefix = feidenavn.substring(0, feidenavn.indexOf('@'))
  const upn = `${upnPrefix}${studentUpnSuffix}`
  const accessToken = await graphToken(context)
  const { data } = await axios.get(`${graphUrl}/users/${upn}`, { headers: { Authorization: `Bearer ${accessToken}` } })
  return data
}

const getUserFromAnsattnummer = async (ansattnummer, context) => {
  const accessToken = await graphToken(context)
  const { data } = await axios.get(`${graphUrl}/users?$count=true&$filter=onPremisesExtensionAttributes/${employeeNumberExtenstionAttribute}+eq+'${ansattnummer}'`, { headers: { Authorization: `Bearer ${accessToken}`, ConsistencyLevel: 'eventual' } })
  return data
}

const getFeidenavnFromAnsattnummer = async (ansattnummer, context) => {
  const accessToken = await graphToken(context)
  const { data } = await axios.get(`${graphUrl}/users?$count=true&$filter=onPremisesExtensionAttributes/${employeeNumberExtenstionAttribute}+eq+'${ansattnummer}'&$select=onPremisesSamAccountName`, { headers: { Authorization: `Bearer ${accessToken}`, ConsistencyLevel: 'eventual' } })
  if (data.value && data.value.length === 1 && data.value[0].onPremisesSamAccountName) {
    return { feidenavn: `${data.value[0].onPremisesSamAccountName}${feidenavnDomain}` }
  } else {
    return null
  }
}

module.exports = { getFeidenavn, getAnsattnummer, getUserFromSamAccount, getUserFromAnsattnummer, getFeidenavnFromAnsattnummer, getStudentFromFeidenavn }
